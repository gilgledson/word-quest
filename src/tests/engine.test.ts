import { describe, it, expect } from "vitest";
import { levels, dailyPuzzle } from "../data/catalog";
import {
  CLUE_MAX_CHARS,
  CLUE_MAX_WORD,
  GRID_COLS,
  GRID_ROWS,
  PuzzleEngine,
  PuzzleValidator,
  economy,
  positions,
  type Puzzle,
  type Session,
} from "../game/crossword-engine";

/** Grade pequena e manual (CASA × ARTE × TERRA) para testar regras isoladas. */
const small: Puzzle = {
  id: "mini",
  number: 1,
  world: "vila",
  difficulty: "tutorial",
  rows: 5,
  cols: 7,
  words: [
    {
      id: "casa",
      clue: "Lar",
      answer: "CASA",
      direction: "horizontal",
      startRow: 1,
      startCol: 1,
      clueRow: 1,
      clueCol: 0,
      arrow: "right",
    },
    {
      id: "arte",
      clue: "Obra criativa",
      answer: "ARTE",
      direction: "vertical",
      startRow: 1,
      startCol: 2,
      clueRow: 0,
      clueCol: 2,
      arrow: "down",
    },
    {
      id: "terra",
      clue: "Nosso planeta",
      answer: "TERRA",
      direction: "horizontal",
      startRow: 3,
      startCol: 2,
      clueRow: 3,
      clueCol: 1,
      arrow: "right",
    },
  ],
};
/** Uma célula de pista com duas palavras: AB para a direita e AC para baixo. */
const pair: Puzzle = {
  id: "par",
  number: 1,
  world: "vila",
  difficulty: "tutorial",
  rows: 3,
  cols: 3,
  words: [
    {
      id: "ab",
      clue: "Primeiras letras",
      answer: "AB",
      direction: "horizontal",
      startRow: 0,
      startCol: 1,
      clueRow: 0,
      clueCol: 0,
      arrow: "right",
    },
    {
      id: "ac",
      clue: "Antes de D",
      answer: "AC",
      direction: "vertical",
      startRow: 1,
      startCol: 0,
      clueRow: 0,
      clueCol: 0,
      arrow: "down",
    },
  ],
};

const solutionOf = (p: Puzzle) =>
  Object.fromEntries(
    p.words.flatMap((w) => positions(w).map((c) => [c.key, c.letter])),
  );
const openCells = (p: Puzzle, s: Session) =>
  Object.entries(solutionOf(p)).filter(([k]) => !s.letters[k]);
const wordAt = (p: Puzzle, cell: string) =>
  p.words.find((w) => positions(w).some((c) => c.key === cell))!;
const usefulTile = (p: Puzzle, s: Session) => {
  for (const id of s.rack)
    for (const [k, letter] of openCells(p, s))
      if (s.tiles[id].letter === letter) return { id, cell: k };
  return undefined;
};
const pending = (s: Session) =>
  s.history.filter((k) => s.letters[k] && !s.locked.includes(k));

/** Joga a fase inteira só com ações gratuitas: coloca letras certas e confirma. */
function solveForFree(engine: PuzzleEngine, start: Session) {
  const solution = solutionOf(engine.puzzle);
  let s = start;
  for (let step = 0; step < 800 && !engine.complete(s); step++) {
    const wrong = pending(s).some((k) => s.letters[k] !== solution[k]);
    const move = wrong ? undefined : usefulTile(engine.puzzle, s);
    if (move) {
      const word = wordAt(engine.puzzle, move.cell);
      const next = engine.insert(s, word.id, move.id, move.cell);
      expect(next).not.toBe(s);
      s = next;
    } else s = engine.confirm(s, "p").session;
    expect(engine.rack.audit(s)).toEqual([]);
  }
  return engine.confirm(s, "p").session;
}

describe("Catálogo", () => {
  it.each(levels)("$id é válido, 8×10 e denso", (p) => {
    expect(PuzzleValidator.validateCatalog(p)).toEqual([]);
    expect(p.rows).toBe(GRID_ROWS);
    expect(p.cols).toBe(GRID_COLS);
    expect(p.words.length).toBeGreaterThanOrEqual(20);
    const cells = new PuzzleEngine(p).matrix();
    expect(cells).toHaveLength(GRID_ROWS * GRID_COLS);
    expect(
      cells.filter((c) => c.kind === "blocked").length,
    ).toBeLessThanOrEqual(5);
  });
  it.each(levels)("$id: pistas simples e duplas legíveis", (p) => {
    for (const w of p.words) {
      expect(w.clue.length).toBeLessThanOrEqual(CLUE_MAX_CHARS);
      for (const part of w.clue.split(" "))
        expect(part.length).toBeLessThanOrEqual(CLUE_MAX_WORD);
    }
    const clueCells = new PuzzleEngine(p)
      .matrix()
      .filter((c) => c.kind === "clue");
    for (const c of clueCells) {
      expect(c.kind === "clue" && c.words.length).toBeLessThanOrEqual(2);
      if (c.kind === "clue" && c.words.length === 2)
        expect(new Set(c.words.map((w) => w.arrow)).size).toBe(2);
    }
    expect(
      clueCells.some((c) => c.kind === "clue" && c.words.length === 2),
    ).toBe(true);
  });
  it.each(levels)(
    "$id: toda casa de resposta está numa palavra de 2+ letras",
    (p) => {
      const cells = new PuzzleEngine(p).matrix();
      for (const c of cells)
        if (c.kind === "letter") expect(c.wordIds.length).toBeGreaterThan(0);
      for (const w of p.words)
        expect(positions(w).length).toBeGreaterThanOrEqual(2);
      expect(new Set(p.words.map((w) => w.id)).size).toBe(p.words.length);
    },
  );
  it("aceita duas pistas na mesma célula e rejeita três ou a mesma direção", () => {
    expect(PuzzleValidator.validate(pair)).toEqual([]);
    const clue = new PuzzleEngine(pair).matrix()[0];
    expect(clue.kind === "clue" && clue.words.map((w) => w.id)).toEqual([
      "ab",
      "ac",
    ]);
    const same = structuredClone(pair);
    same.words[1] = {
      ...same.words[1],
      direction: "horizontal",
      arrow: "right",
      startRow: 0,
      startCol: 1,
    };
    expect(PuzzleValidator.validate(same)).toContain("Pistas sobrepostas");
    const three = structuredClone(pair);
    three.words.push({ ...three.words[0], id: "ab2" });
    expect(PuzzleValidator.validate(three)).toContain("Pistas sobrepostas");
  });
  it("rejeita tamanho fora do padrão e grade pouco densa", () => {
    expect(PuzzleValidator.validateCatalog(small)).toEqual(
      expect.arrayContaining(["Grade deve ter 8×10"]),
    );
    const sparse = structuredClone(levels[0]);
    sparse.words = sparse.words.slice(0, 5);
    expect(PuzzleValidator.validateCatalog(sparse)).toContain(
      "Grade pouco densa",
    );
  });
  it("rejeita conflitos, setas incorretas e casas excedentes", () => {
    const p = structuredClone(small);
    p.words[1].answer = "ERRO";
    p.words[0].arrow = "down";
    expect(PuzzleValidator.validate(p)).toContain("Conflito de letras");
    expect(PuzzleValidator.validate(p)).toContain("Seta inconsistente");
    const extra = structuredClone(small);
    extra.words.push({
      id: "extra",
      clue: "Saudação",
      answer: "OI",
      direction: "vertical",
      startRow: 1,
      startCol: 5,
      clueRow: 0,
      clueCol: 5,
      arrow: "down",
    });
    expect(PuzzleValidator.validate(extra)).toContain(
      "Casas excedentes após a resposta",
    );
  });
  it("seleciona o mesmo desafio para a mesma data", () => {
    expect(dailyPuzzle("2026-10-24")).toEqual(dailyPuzzle("2026-10-24"));
  });
});

describe("Inventário de peças", () => {
  it.each(levels)(
    "$id cria uma peça por casa de resposta, só com letras da solução",
    (p) => {
      const engine = new PuzzleEngine(p);
      const s = engine.start("t", "medio");
      const solution = solutionOf(p);
      const frequency = (letters: string[]) =>
        letters.reduce<Record<string, number>>(
          (n, l) => ({ ...n, [l]: (n[l] ?? 0) + 1 }),
          {},
        );
      expect(Object.keys(s.tiles)).toHaveLength(Object.keys(solution).length);
      expect(frequency(Object.values(s.tiles).map((t) => t.letter))).toEqual(
        frequency(Object.values(solution)),
      );
      expect(s.rack).toHaveLength(economy.rackStart);
      expect(s.botRack).toHaveLength(economy.rackStart);
      expect(s.supply).toHaveLength(
        Object.keys(solution).length - 2 * economy.rackStart,
      );
      expect(engine.rack.audit(s)).toEqual([]);
    },
  );
  it("conta letras repetidas e cruzamentos uma única vez", () => {
    const s = new PuzzleEngine(small).start("t", "medio");
    expect(Object.keys(s.tiles)).toHaveLength(11);
    expect(Object.values(s.tiles).filter((t) => t.letter === "R")).toHaveLength(
      3,
    );
  });
  it("o banco só recebe letras ainda necessárias", () => {
    const s = new PuzzleEngine(small).start("t", "medio");
    for (const id of s.rack)
      expect(openCells(small, s).map(([, l]) => l)).toContain(
        s.tiles[id].letter,
      );
  });
  it("coloca na casa pedida, substituindo letras pendentes e recusando casas confirmadas ou de outras palavras", () => {
    const engine = new PuzzleEngine(small);
    const s = engine.start("t", "medio");
    const id = s.rack[0];
    expect(engine.insert(s, "casa", id, "3,6")).toBe(s);
    const placed = engine.insert(s, "casa", id, "1,3");
    expect(placed.letters["1,3"]).toBe(s.tiles[id].letter);
    expect(placed.rack).not.toContain(id);
    // Uma letra ainda não confirmada pode ser substituída: a antiga volta ao banco.
    const swapped = engine.insert(placed, "casa", placed.rack[0], "1,3");
    expect(swapped.rack).toContain(id);
    expect(swapped.tiles[id].cell).toBeUndefined();
    expect(Object.keys(swapped.letters)).toEqual(["1,3"]);
    expect(engine.rack.audit(swapped)).toEqual([]);
    // Casa confirmada não aceita.
    const hinted = engine.hint(s, "casa")!;
    const lockedCell = hinted.locked[0];
    expect(engine.insert(hinted, "casa", hinted.rack[0], lockedCell)).toBe(
      hinted,
    );
    expect(engine.insert(s, "casa", "inexistente")).toBe(s);
  });
  it("Remover devolve exatamente a mesma peça, a última ou a da casa tocada", () => {
    const engine = new PuzzleEngine(small);
    let s = engine.start("t", "medio");
    const [a, b] = s.rack;
    s = engine.insert(s, "casa", a, "1,1");
    s = engine.insert(s, "casa", b, "1,3");
    const last = engine.remove(s)!;
    expect(last.rack).toContain(b);
    expect(last.letters["1,1"]).toBe(s.tiles[a].letter);
    const touched = engine.remove(s, undefined, "1,1")!;
    expect(touched.rack).toContain(a);
    expect(touched.tiles[a].cell).toBeUndefined();
    expect(engine.rack.audit(touched)).toEqual([]);
    expect(engine.remove(engine.start("t", "medio"))).toBeUndefined();
    expect(engine.remove(s, undefined, "1,2")).toBeUndefined();
  });
  it("o jogador começa com 5 peças e esse é o máximo", () => {
    const engine = new PuzzleEngine(levels[0]);
    const s = engine.start("t", "medio");
    expect(s.rack).toHaveLength(5);
    expect(economy.rackMax).toBe(5);
    const word = levels[0].words[0];
    const placed = engine.insert(s, word.id, s.rack[0]);
    expect(placed.rack).toHaveLength(4);
  });
  it("as peças só são repostas ao concluir o turno (✓), não no meio dele", () => {
    const engine = new PuzzleEngine(levels[0]);
    let s = engine.start("t", "medio");
    const open = Object.keys(engine.rack.solution);
    // Gasta o banco inteiro: nada é reposto até o ✓.
    for (const id of [...s.rack]) {
      const cell = open.find((k) => !s.letters[k])!;
      const word = levels[0].words.find((w) =>
        positions(w).some((c) => c.key === cell),
      )!;
      s = engine.insert(s, word.id, id, cell);
    }
    expect(s.rack).toHaveLength(0);
    const after = engine.confirm(s, "p").session;
    expect(after.rack.length).toBeGreaterThan(0);
    expect(after.rack.length).toBeLessThanOrEqual(economy.rackMax);
    expect(engine.rack.audit(after)).toEqual([]);
  });
  it("Trocar substitui por letras diferentes e úteis; sem alternativa recusa", () => {
    const engine = new PuzzleEngine(levels[0]);
    const s = engine.start("t", "medio");
    const out = s.rack.slice(0, 2);
    const swapped = engine.swap(s, out)!;
    for (const id of out) {
      expect(swapped.rack).not.toContain(id);
      expect(swapped.supply).toContain(id);
    }
    expect(engine.rack.audit(swapped)).toEqual([]);
    expect(engine.swap(s, [])).toBeUndefined();
    expect(engine.swap(s, ["fora"])).toBeUndefined();
    const tiny = new PuzzleEngine({ ...small, words: [small.words[0]] });
    const all = tiny.start("t", "medio");
    expect(all.supply).toHaveLength(0);
    expect(tiny.swap(all, [all.rack[0]])).toBeUndefined();
  });
});

describe("Confirmação ✓, pontos e ajudas", () => {
  /** Banco com as letras de uma palavra (o sorteio inicial é aleatório). */
  const withLetters = (engine: PuzzleEngine, s: Session, wordId: string) => {
    const word = engine.puzzle.words.find((w) => w.id === wordId)!;
    const used: string[] = [];
    // Devolve a mão do oponente à reserva para o teste escolher as letras que quiser.
    let next: Session = {
      ...s,
      supply: [...s.supply, ...s.botRack],
      botRack: [],
    };
    for (const c of positions(word)) {
      const have = (id: string) =>
        next.tiles[id].letter === c.letter &&
        !used.includes(id) &&
        !next.tiles[id].cell;
      let id = next.rack.find(have);
      if (!id) {
        id = next.supply.find(have)!;
        next = {
          ...next,
          supply: next.supply.filter((t) => t !== id),
          rack: [...next.rack, id],
        };
      }
      used.push(id);
    }
    return { s: next, used };
  };
  it("letras ficam pendentes até ✓; só as corretas travam e pontuam", () => {
    const engine = new PuzzleEngine(small);
    const start = withLetters(engine, engine.start("t", "medio"), "casa");
    const { used } = start;
    let s = start.s;
    s = engine.insert(s, "casa", used[0], "1,1"); // C certo
    s = engine.insert(s, "casa", used[1], "1,2"); // A certo
    const wrong = s.rack.find((id) => s.tiles[id].letter !== "S")!;
    s = engine.insert(s, "casa", wrong, "1,3"); // errada
    expect(s.locked).toEqual([]);
    const r = engine.confirm(s, "p");
    expect(r.gained).toBe(2);
    expect(r.returned).toBe(1);
    expect(r.session.locked.sort()).toEqual(["1,1", "1,2"]);
    expect(r.session.owners).toEqual({ "1,1": "p", "1,2": "p" });
    // 2 letras certas (+2) e 1 errada (−1, mas o placar começa em 0 e nunca fica negativo).
    expect(r.session.scores.p).toBe(1);
    expect(r.session.rack.concat(r.session.supply)).toContain(wrong);
    expect(engine.rack.audit(r.session)).toEqual([]);
  });
  it("sem peças pendentes ✓ é passar a vez", () => {
    const engine = new PuzzleEngine(small);
    const s = engine.start("t", "medio");
    const r = engine.confirm(s, "p");
    expect(r.passed).toBe(true);
    expect(r.session).toEqual(s);
  });
  it("palavra completada no ✓ vale a palavra inteira; as casas de cruzamento entram em cada palavra", () => {
    const engine = new PuzzleEngine(small);
    const start = withLetters(engine, engine.start("t", "medio"), "casa");
    let s = start.s;
    positions(small.words[0]).forEach((c, i) => {
      s = engine.insert(s, "casa", start.used[i], c.key);
    });
    let r = engine.confirm(s, "p");
    // CASA tem 4 letras e as 4 são novas: 4 pontos, sem sobra.
    expect(r.bonus).toBe(0);
    expect(r.session.scores.p).toBe(4);
    // ARTE já tem o A de CASA: 3 casas novas + o A que já estava = ARTE inteira (4 pontos).
    s = withLetters(engine, r.session, "arte").s;
    const open = positions(small.words[1]).filter(
      (c) => !s.locked.includes(c.key),
    );
    expect(open).toHaveLength(3);
    open.forEach((c) => {
      const id = s.rack.find(
        (t) => s.tiles[t].letter === c.letter && !s.tiles[t].cell,
      )!;
      s = engine.insert(s, "arte", id, c.key);
    });
    r = engine.confirm(s, "p");
    expect(r.gained).toBe(3);
    expect(r.bonus).toBe(1);
    expect(r.session.scores.p).toBe(4 + 4);
  });
  it("fechar a palavra com 1 letra leva a palavra inteira, inclusive as letras do oponente", () => {
    const engine = new PuzzleEngine(small);
    const casa = positions(small.words[0]);
    const last = casa.at(-1)!;
    // O oponente já confirmou as 3 primeiras letras de CASA e ficou com esses pontos.
    const start = JSON.parse(
      JSON.stringify(engine.start("t", "medio")),
    ) as Session;
    for (const c of casa.slice(0, -1)) {
      // Trava a casa para o oponente, tirando a peça de onde estiver (banco, reserva ou mão dele).
      const t = Object.values(start.tiles).find(
        (x) => x.letter === c.letter && !x.cell,
      )!;
      start.rack = start.rack.filter((id) => id !== t.id);
      start.supply = start.supply.filter((id) => id !== t.id);
      start.botRack = start.botRack.filter((id) => id !== t.id);
      t.cell = c.key;
      start.letters[c.key] = c.letter;
      start.locked.push(c.key);
      start.owners[c.key] = "ai";
    }
    start.scores.ai = 3;
    const bot = { session: start };
    const aiBefore = bot.session.scores.ai;
    const id = [
      ...bot.session.rack,
      ...bot.session.supply,
      ...bot.session.botRack,
    ].find(
      (t) =>
        bot.session.tiles[t].letter === last.letter &&
        !bot.session.tiles[t].cell,
    )!;
    const withTile = {
      ...bot.session,
      rack: [...bot.session.rack.filter((t) => t !== id), id],
      supply: bot.session.supply.filter((t) => t !== id),
      botRack: bot.session.botRack.filter((t) => t !== id),
    };
    const placed = engine.insert(withTile, "casa", id, last.key);
    const r = engine.confirm(placed, "p");
    expect(r.gained).toBe(1);
    // Quem fecha leva a palavra toda: as 3 letras do oponente + a sua = 4 pontos.
    expect(r.session.scores.p).toBe(4);
    expect(r.bonus).toBe(3);
    // O oponente mantém o que já tinha.
    expect(r.session.scores.ai).toBe(aiBefore);
  });
  it("cada letra confirmada no lugar errado custa 1 ponto, sem deixar o placar negativo", () => {
    const engine = new PuzzleEngine(small);
    const casa = positions(small.words[0]);
    const place = (s: Session, key: string) => {
      const letter = casa.find((c) => c.key === key)!.letter;
      const id = s.rack.find((t) => s.tiles[t].letter !== letter)!;
      return engine.insert(s, "casa", id, key);
    };
    let s = engine.start("t", "medio");
    s.scores.p = 3;
    s = place(s, casa[0].key);
    s = place(s, casa[1].key);
    const r = engine.confirm(s, "p");
    expect(r.gained).toBe(0);
    expect(r.returned).toBe(2);
    expect(r.penalty).toBe(2);
    expect(r.wrongCells.sort()).toEqual([casa[0].key, casa[1].key].sort());
    expect(r.session.scores.p).toBe(1);
    expect(engine.rack.audit(r.session)).toEqual([]);
    // Com 1 ponto, mais 2 letras erradas: perde só o que tem.
    let t = r.session;
    t = place(t, casa[0].key);
    t = place(t, casa[1].key);
    const again = engine.confirm(t, "p");
    expect(again.penalty).toBe(1);
    expect(again.session.scores.p).toBe(0);
  });
  it("letras certas e erradas na mesma jogada: soma as certas e desconta as erradas", () => {
    const engine = new PuzzleEngine(small);
    const casa = positions(small.words[0]);
    let s = engine.start("t", "medio");
    s.scores.p = 5;
    const right = withLetters(engine, s, "casa");
    s = right.s;
    s = engine.insert(s, "casa", right.used[0], casa[0].key);
    const letter = casa[1].letter;
    const wrongId = s.rack.find(
      (t) => s.tiles[t].letter !== letter && !s.tiles[t].cell,
    )!;
    s = engine.insert(s, "casa", wrongId, casa[1].key);
    const r = engine.confirm(s, "p");
    expect(r.gained).toBe(1);
    expect(r.returned).toBe(1);
    expect(r.session.scores.p).toBe(5 + 1 - 1);
  });
  it("palavra completada por Dica não rende bônus nem pontos", () => {
    const engine = new PuzzleEngine(small);
    let s = engine.start("t", "medio");
    for (let i = 0; i < 4; i++) s = engine.hint(s, "casa") ?? s;
    expect(s.locked.length).toBeGreaterThan(0);
    expect(s.scores).toEqual({ p: 0, ai: 0 });
    expect(s.owners).toEqual({});
    expect(engine.rack.audit(s)).toEqual([]);
    const r = engine.confirm(s, "p");
    expect(r.passed).toBe(true);
    expect(r.bonus).toBe(0);
  });
  it("Dica trava a letra correta, inclusive sobre uma peça errada", () => {
    const engine = new PuzzleEngine(small);
    let s = engine.start("t", "medio");
    const wrong = s.rack.find((id) => s.tiles[id].letter !== "C")!;
    s = engine.insert(s, "casa", wrong, "1,1");
    const hinted = engine.hint(s, "casa")!;
    expect(hinted.letters["1,1"]).toBe("C");
    expect(hinted.locked).toContain("1,1");
    expect(hinted.rack.concat(hinted.supply)).toContain(wrong);
    expect(engine.rack.audit(hinted)).toEqual([]);
  });
  it.each(levels)("$id é concluível só com ações gratuitas", (p) => {
    const engine = new PuzzleEngine(p);
    const s = solveForFree(engine, engine.start("t", "medio"));
    expect(engine.complete(s)).toBe(true);
    expect(engine.rack.audit(s)).toEqual([]);
    expect(
      Object.values(s.tiles).every((t) => t.cell && s.locked.includes(t.cell)),
    ).toBe(true);
    expect(Object.values(s.owners).every((o) => o === "p")).toBe(true);
  });
  it("recupera impasses: letras necessárias presas em casas erradas voltam ao banco", () => {
    const engine = new PuzzleEngine(small);
    let s = engine.start("t", "medio");
    for (let i = 0; i < 40 && s.rack.length; i++) {
      const id = s.rack[0];
      const target = openCells(small, s).find(
        ([, l]) => l !== s.tiles[id].letter,
      );
      if (!target) break;
      s = engine.insert(s, wordAt(small, target[0]).id, id, target[0]);
      expect(engine.rack.audit(s)).toEqual([]);
    }
    const done = solveForFree(engine, s);
    expect(engine.complete(done)).toBe(true);
  });
});

describe("Propriedade: sequências aleatórias de ações", () => {
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  it.each(
    levels.flatMap((p) => [1, 2, 3, 4, 5].map((seed) => [p, seed] as const)),
  )("%# conserva peças, saldo e jogabilidade", (p, seed) => {
    const engine = new PuzzleEngine(p);
    const r = rng(seed * 7919);
    const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
    let s = engine.start(`p${seed}`, "medio");
    let coins = 100;
    const spend = (cost: number) => {
      if (coins < cost) return false;
      coins -= cost;
      return true;
    };
    for (let step = 0; step < 100; step++) {
      const op = pick([
        "place",
        "place",
        "place",
        "confirm",
        "remove",
        "swap",
        "hint",
        "bot",
        "save",
      ]);
      if (op === "place" && s.rack.length) {
        const word = pick(p.words);
        const empty = positions(word).filter((c) => !s.letters[c.key]);
        if (empty.length)
          s = engine.insert(s, word.id, pick(s.rack), pick(empty).key);
      } else if (op === "confirm") s = engine.confirm(s, "p").session;
      else if (op === "remove") s = engine.remove(s) ?? s;
      else if (op === "swap" && s.rack.length) {
        const ids = s.rack.filter(() => r() < 0.5).slice(0, economy.swapMax);
        const next =
          ids.length && coins >= ids.length * economy.swap
            ? engine.swap(s, ids)
            : undefined;
        if (next && spend(ids.length * economy.swap)) s = next;
      } else if (op === "hint") {
        const next = engine.hint(s, pick(p.words).id);
        if (next && spend(economy.hint)) s = next;
      } else if (op === "bot") {
        const cells = openCells(p, s)
          .map(([k]) => k)
          .filter(() => r() < 0.2);
        s = engine.play(s, cells, "ai")?.session ?? s;
      } else if (op === "save") {
        const restored = JSON.parse(JSON.stringify(s)) as Session;
        expect(restored).toEqual(s);
        s = restored;
      }
      expect(engine.rack.audit(s)).toEqual([]);
      expect(coins).toBeGreaterThanOrEqual(0);
      expect(s.rack.length).toBeLessThanOrEqual(economy.rackMax);
      for (const k of Object.keys(s.owners)) expect(s.locked).toContain(k);
      // Sem nada pendente, o jogador sempre tem uma peça que serve.
      if (openCells(p, s).length && !s.history.length)
        expect(usefulTile(p, s)).toBeDefined();
    }
    const done = solveForFree(engine, s);
    expect(engine.complete(done)).toBe(true);
  });
});

describe("Bônus de palavras completadas com uma letra", () => {
  /** Dá ao jogador a peça da letra (tirando da reserva ou da mão do oponente). */
  const give = (s: Session, letter: string): [Session, string] => {
    const id = [...s.rack, ...s.supply, ...s.botRack].find(
      (t) => s.tiles[t].letter === letter && !s.tiles[t].cell,
    )!;
    return [
      {
        ...s,
        rack: [...s.rack.filter((t) => t !== id), id],
        supply: s.supply.filter((t) => t !== id),
        botRack: s.botRack.filter((t) => t !== id),
      },
      id,
    ];
  };
  /** Trava (sem pontos) tudo menos a última casa de cada palavra. */
  const leaveOne = (engine: PuzzleEngine, ids: string[]) => {
    let s = engine.start("bonus", "medio");
    const keep = new Set<string>();
    for (const id of ids) {
      const word = engine.puzzle.words.find((w) => w.id === id)!;
      keep.add(positions(word).at(-1)!.key);
    }
    const copy = JSON.parse(JSON.stringify(s)) as Session;
    for (const id of ids) {
      const word = engine.puzzle.words.find((w) => w.id === id)!;
      for (const c of positions(word))
        if (!keep.has(c.key) && !copy.locked.includes(c.key))
          engine.rack.lockCell(copy, c.key);
    }
    s = copy;
    return { s, keep };
  };
  const completed = (engine: PuzzleEngine, before: Session, after: Session) => {
    const was = new Set(engine.solved(before).map((w) => w.id));
    return engine.solved(after).filter((w) => !was.has(w.id));
  };

  it.each(levels)(
    "$id: duas palavras fechadas com uma letra cada, no mesmo ✓, rendem bônus as duas",
    (p) => {
      const engine = new PuzzleEngine(p);
      // Duas palavras sem casas em comum.
      const cells = (id: string) =>
        positions(p.words.find((w) => w.id === id)!).map((c) => c.key);
      let pair: [string, string] | undefined;
      for (const a of p.words)
        for (const b of p.words)
          if (a.id < b.id && !cells(a.id).some((k) => cells(b.id).includes(k)))
            pair ??= [a.id, b.id];
      const { s: base, keep } = leaveOne(engine, pair!);
      let s = base;
      for (const key of keep) {
        const [withTile, tile] = give(s, solutionOf(p)[key]);
        s = engine.insert(withTile, wordAt(p, key).id, tile, key);
      }
      const r = engine.confirm(s, "p");
      const done = completed(engine, base, r.session);
      expect(done.map((w) => w.id)).toEqual(expect.arrayContaining(pair!));
      expect(r.gained).toBe(keep.size);
      // Cada palavra fechada vale o tamanho inteiro, mesmo com uma letra nova só.
      const total = done.reduce((n, w) => n + positions(w).length, 0);
      expect(r.bonus).toBe(total - r.gained);
      expect(r.session.scores.p).toBe(total);
      expect(engine.rack.audit(r.session)).toEqual([]);
    },
  );
  it.each(levels)(
    "$id: duas palavras fechadas com uma letra cada em ✓ seguidos valem a palavra inteira nos dois turnos",
    (p) => {
      const engine = new PuzzleEngine(p);
      const cells = (id: string) =>
        positions(p.words.find((w) => w.id === id)!).map((c) => c.key);
      let pair: [string, string] | undefined;
      for (const a of p.words)
        for (const b of p.words)
          if (a.id < b.id && !cells(a.id).some((k) => cells(b.id).includes(k)))
            pair ??= [a.id, b.id];
      const { s: base, keep } = leaveOne(engine, pair!);
      let s = base;
      let total = 0;
      for (const key of keep) {
        const [withTile, tile] = give(s, solutionOf(p)[key]);
        const placed = engine.insert(withTile, wordAt(p, key).id, tile, key);
        const r = engine.confirm(placed, "p");
        const done = completed(engine, s, r.session);
        expect(done.length).toBeGreaterThanOrEqual(1);
        const size = done.reduce((n, w) => n + positions(w).length, 0);
        expect(r.gained).toBe(1);
        expect(r.bonus).toBe(size - 1);
        total += size;
        s = r.session;
      }
      expect(s.scores.p).toBe(total);
      expect(s.scores.p).toBeGreaterThanOrEqual(
        pair!.reduce(
          (n, id) => n + positions(p.words.find((w) => w.id === id)!).length,
          0,
        ),
      );
    },
  );
  it("uma letra que fecha duas palavras de uma vez (cruzamento) vale as duas palavras inteiras", () => {
    const engine = new PuzzleEngine(small);
    // A (1,2) é o primeiro A de ARTE e o segundo de CASA: fechar tudo menos esse cruzamento.
    const base = engine.start("cruz", "medio");
    const s0 = JSON.parse(JSON.stringify(base)) as Session;
    const cross = "1,2";
    for (const w of small.words)
      for (const c of positions(w))
        if (c.key !== cross && !s0.locked.includes(c.key))
          if (!(w.id === "terra")) engine.rack.lockCell(s0, c.key);
    const [withTile, tile] = give(s0, "A");
    const placed = engine.insert(withTile, "casa", tile, cross);
    const r = engine.confirm(placed, "p");
    const done = completed(engine, s0, r.session).map((w) => w.id);
    expect(done).toEqual(expect.arrayContaining(["casa", "arte"]));
    expect(r.gained).toBe(1);
    // CASA (4) + ARTE (4): a letra do cruzamento entra nas duas.
    expect(r.bonus).toBe(7);
    expect(r.session.scores.p).toBe(8);
  });
});
