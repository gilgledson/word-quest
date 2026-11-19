import { describe, expect, it } from "vitest";
import { levelGrid, levels, variantCount } from "../data/catalog";
import {
  PuzzleEngine,
  positions,
  type Session,
} from "../game/crossword-engine";
import {
  guided,
  guideUsable,
  tutorialPick,
  tutorialWord,
} from "../features/puzzle/tutorialPick";
import { complementRects } from "../features/puzzle/coachGeometry";

const puzzle = levels[0];
const engine = new PuzzleEngine(puzzle);
const solution = Object.fromEntries(
  puzzle.words.flatMap((w) => positions(w).map((c) => [c.key, c.letter])),
);
/** Sessão nova com o banco trocado pelas letras pedidas (peças tiradas da própria grade). */
function withBank(letters: string[], joker = false): Session {
  const s = engine.start("tutorial", "facil");
  const free = Object.values(s.tiles).filter((t) => !t.joker);
  const rack: string[] = [];
  for (const l of letters) {
    const t = free.find((x) => x.letter === l && !rack.includes(x.id));
    if (t) rack.push(t.id);
  }
  if (joker) {
    const j = Object.values(s.tiles).find((t) => t.joker);
    if (j) rack.push(j.id);
  }
  return { ...s, rack };
}

describe("palavra do tutorial", () => {
  it("escolhe uma casa vazia cuja letra está no banco", () => {
    const s = engine.start("tutorial", "facil");
    const pick = tutorialPick(puzzle, s)!;
    expect(pick).toBeDefined();
    const bank = s.rack.map((id) => s.tiles[id]).filter((t) => !t.joker);
    expect(bank.map((t) => t.letter)).toContain(solution[pick.cell]);
    const word = puzzle.words.find((w) => w.id === pick.wordId)!;
    expect(positions(word).map((c) => c.key)).toContain(pick.cell);
  });
  it("não fica na primeira palavra quando o banco não tem as letras dela", () => {
    const first = puzzle.words[0];
    const firstLetters = new Set(positions(first).map((c) => c.letter));
    // Banco só com letras que a primeira palavra não usa.
    const others = Object.values(solution).filter((l) => !firstLetters.has(l));
    if (!others.length) return;
    const s = withBank(others.slice(0, 5));
    const pick = tutorialPick(puzzle, s)!;
    expect(pick.wordId).not.toBe(first.id);
    expect(others).toContain(solution[pick.cell]);
  });
  it("o curinga não conta, e sem letra que sirva não escolhe nada", () => {
    const s = withBank([], true);
    expect(tutorialPick(puzzle, s)).toBeUndefined();
  });
  it("prefere a palavra que o banco preenche em mais casas", () => {
    const words = [...puzzle.words].sort(
      (a, b) => positions(b).length - positions(a).length,
    );
    const long = words[0];
    const s = withBank(
      positions(long)
        .map((c) => c.letter)
        .slice(0, 5),
    );
    const pick = tutorialPick(puzzle, s)!;
    const covered = (wId: string) => {
      const w = puzzle.words.find((x) => x.id === wId)!;
      const bank = s.rack.map((id) => s.tiles[id].letter);
      return positions(w).filter((c) => {
        const i = bank.indexOf(c.letter);
        if (i < 0) return false;
        bank.splice(i, 1);
        return true;
      }).length;
    };
    expect(covered(pick.wordId)).toBeGreaterThanOrEqual(covered(long.id));
  });
});

describe("palavra guiada do tutorial", () => {
  it("na fase 1 é AGUA; em todas as fases e variantes há uma horizontal de 3 a 5 letras", () => {
    expect(tutorialWord(puzzle)?.answer).toBe("AGUA");
    for (const level of levels)
      for (let v = 0; v < variantCount(level.id); v++) {
        const grid = levelGrid(level.id, v)!;
        const w = tutorialWord(grid);
        if (!w) continue;
        expect(w.direction).toBe("horizontal");
        expect(positions(w).length).toBeGreaterThanOrEqual(3);
        expect(positions(w).length).toBeLessThanOrEqual(5);
        // Determinística: a mesma grade dá sempre a mesma palavra.
        expect(tutorialWord(grid)?.id).toBe(w.id);
      }
  });
  it("sem candidata (só palavras longas ou verticais), não escolhe nada", () => {
    const long = {
      ...puzzle,
      words: puzzle.words.filter(
        (w) => w.direction === "vertical" || positions(w).length > 5,
      ),
    };
    expect(tutorialWord(long)).toBeUndefined();
  });
  it("o banco começa com as letras exatas, inclusive repetidas, sem criar nem perder peças", () => {
    const word = tutorialWord(puzzle)!;
    const plain = engine.start("tutorial", "facil");
    const s = engine.start("tutorial", "facil", {}, word);
    const letters = (ids: string[]) =>
      ids
        .map((id) => s.tiles[id].letter)
        .sort()
        .join("");
    expect(letters(s.rack)).toBe(
      positions(word)
        .map((c) => c.letter)
        .sort()
        .join(""),
    );
    expect(Object.keys(s.tiles)).toHaveLength(Object.keys(plain.tiles).length);
    expect(s.rack.length + s.supply.length + s.botRack.length).toBe(
      plain.rack.length + plain.supply.length + plain.botRack.length,
    );
    expect(engine.rack.audit(s)).toEqual([]);
  });
  it("sem uma das letras na reserva, o banco não muda", () => {
    const word = tutorialWord(puzzle)!;
    const s = engine.start("tutorial", "facil");
    const letter = positions(word)[0].letter;
    const starved = {
      ...s,
      supply: s.supply.filter((id) => s.tiles[id].letter !== letter),
      rack: s.rack.filter((id) => s.tiles[id].letter !== letter),
    };
    expect(engine.rack.dealWord(starved, word)).toBeUndefined();
  });
  it("o andamento lê a grade casa a casa, em qualquer ordem; cheia não é confirmada", () => {
    const word = tutorialWord(puzzle)!;
    let s = engine.start("tutorial", "facil", {}, word);
    const cells = positions(word);
    expect(guided(word, s)).toMatchObject({
      filled: 0,
      missing: cells.length,
      complete: false,
      confirmed: false,
      next: { key: cells[0].key },
    });
    expect(guideUsable(guided(word, s), s)).toBe(true);
    // Começa pela última casa: a próxima sugerida continua sendo a primeira vazia.
    const put = (cell: { key: string; letter: string }) => {
      const id = s.rack.find((x) => s.tiles[x].letter === cell.letter)!;
      s = engine.insert(s, word.id, id, cell.key);
    };
    put(cells[cells.length - 1]);
    expect(guided(word, s)).toMatchObject({
      filled: 1,
      next: { key: cells[0].key },
    });
    // Tirar a letra devolve a conta.
    s = engine.remove(s, word, cells[cells.length - 1].key)!;
    expect(guided(word, s).filled).toBe(0);
    for (const c of cells) put(c);
    const full = guided(word, s);
    expect(full).toMatchObject({ complete: true, confirmed: false });
    expect(full.next).toBeUndefined();
    const done = engine.confirm(s, "p").session;
    expect(guided(word, done)).toMatchObject({
      complete: false,
      confirmed: true,
    });
    expect(guideUsable(guided(word, done), done)).toBe(false);
  });
  it("a prévia do ✓ dá o mesmo ganho da confirmação e não mexe na sessão", () => {
    const word = tutorialWord(puzzle)!;
    let s = engine.start("tutorial", "facil", {}, word);
    for (const c of positions(word)) {
      const id = s.rack.find((x) => s.tiles[x].letter === c.letter)!;
      s = engine.insert(s, word.id, id, c.key);
    }
    const before = structuredClone(s);
    const { gained } = engine.previewConfirm(s, "p");
    expect(s).toEqual(before);
    const real = engine.confirm(s, "p").session;
    expect(gained).toBe(real.scores.p - s.scores.p);
    expect(gained).toBeGreaterThan(0);
  });
});

describe("camada que barra toques fora dos recortes", () => {
  const area = (
    bs: { left: number; top: number; right: number; bottom: number }[],
  ) => bs.reduce((n, b) => n + (b.right - b.left) * (b.bottom - b.top), 0);
  it("cobre a tela menos os buracos, sem sobrepor nem deixar frestas", () => {
    const holes = [
      { left: 100, top: 200, right: 160, bottom: 400 },
      { left: 0, top: 500, right: 360, bottom: 560 },
    ];
    const rects = complementRects(360, 640, holes);
    expect(area(rects)).toBe(360 * 640 - area(holes));
    // Nenhum retângulo entra num buraco.
    for (const r of rects)
      for (const h of holes)
        expect(
          r.right <= h.left ||
            r.left >= h.right ||
            r.bottom <= h.top ||
            r.top >= h.bottom,
        ).toBe(true);
  });
  it("buracos que se tocam ou passam da tela continuam certos", () => {
    const holes = [
      { left: -20, top: -10, right: 100, bottom: 50 },
      { left: 80, top: 30, right: 200, bottom: 90 },
    ];
    const rects = complementRects(300, 200, holes);
    const covered = (x: number, y: number) =>
      rects.some(
        (r) => x >= r.left && x < r.right && y >= r.top && y < r.bottom,
      );
    expect(covered(10, 10)).toBe(false);
    expect(covered(150, 60)).toBe(false);
    expect(covered(250, 150)).toBe(true);
    expect(covered(10, 150)).toBe(true);
  });
});
