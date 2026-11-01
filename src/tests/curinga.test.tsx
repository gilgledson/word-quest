import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import {
  PuzzleEngine,
  economy,
  positions,
  type Session,
} from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => cleanup());

const level = levels[0];
const engine = new PuzzleEngine(level);
const solution: Record<string, string> = {};
for (const w of level.words)
  for (const c of positions(w)) solution[c.key] = c.letter;
const JOKER = "joker";

/** Partida nova em que o curinga já está no banco (no lugar da última peça). */
function withJoker(seed = "t"): Session {
  const s = engine.start(seed, "medio");
  const dropped = s.rack[s.rack.length - 1];
  return {
    ...s,
    supply: [...s.supply.filter((id) => id !== JOKER), dropped],
    rack: [...s.rack.slice(0, -1), JOKER],
  };
}
const emptyCell = (s: Session) =>
  Object.keys(solution).find((k) => !s.letters[k])!;

describe("Curinga: regras do motor", () => {
  it("há um curinga por partida, na reserva, fora das mãos e fora da conta das letras", () => {
    const s = engine.start("t", "medio");
    expect(s.supply).toContain(JOKER);
    expect(s.rack).not.toContain(JOKER);
    expect(s.botRack).not.toContain(JOKER);
    expect(s.tiles[JOKER]).toMatchObject({ joker: true, letter: "?" });
    expect(engine.rack.audit(s)).toEqual([]);
  });
  it("o oponente nunca recebe o curinga", () => {
    let s = engine.start("t", "medio");
    for (let i = 0; i < 40; i++) {
      s = engine.exchangeBot(s);
      expect(s.botRack).not.toContain(JOKER);
    }
  });
  it("chega ao banco só depois de algumas jogadas do oponente e ocupa uma vaga livre", () => {
    const base = engine.start("t", "medio");
    // Abre uma vaga: coloca uma peça certa e confirma.
    const tile = base.rack.find((id) =>
      Object.values(solution).includes(base.tiles[id].letter),
    )!;
    const cell = Object.keys(solution).find(
      (k) => solution[k] === base.tiles[tile].letter,
    )!;
    const word = level.words.find((w) =>
      positions(w).some((c) => c.key === cell),
    )!;
    const placed = engine.insert(base, word.id, tile, cell);
    const early = engine.confirm(placed, "p").session;
    expect(early.rack).not.toContain(JOKER);
    expect(early.rack).toHaveLength(economy.rackStart);
    const due = {
      ...placed,
      versus: { ...placed.versus, rngCount: economy.jokerAfter },
    };
    const late = engine.confirm(due, "p").session;
    expect(late.rack).toContain(JOKER);
    expect(late.rack.length).toBeLessThanOrEqual(economy.rackMax);
    expect(engine.rack.audit(late)).toEqual([]);
  });
  const wordOf = (cell: string) =>
    level.words.find((w) => positions(w).some((c) => c.key === cell))!;
  it("entra como peça pendente: não mostra a letra, não trava nem pontua até confirmar", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const r = engine.insert(s, wordOf(cell).id, JOKER, cell);
    expect(r.tiles[JOKER].cell).toBe(cell);
    expect(r.tiles[JOKER].letter).toBe("?");
    expect(r.letters[cell]).toBe("?");
    expect(r.locked).not.toContain(cell);
    expect(r.history).toContain(cell);
    expect(r.rack).not.toContain(JOKER);
    expect(r.scores.p).toBe(0);
    expect(engine.rack.audit(r)).toEqual([]);
  });
  it("pode ser movido para outra casa antes de confirmar", () => {
    const s = withJoker();
    const [a, b] = Object.keys(solution).filter((k) => !s.letters[k]);
    const w = wordOf(b);
    const placed = engine.insert(s, wordOf(a).id, JOKER, a);
    const moved = engine.relocate(placed, w.id, a, b);
    expect(moved.letters[a]).toBeUndefined();
    expect(moved.letters[b]).toBe("?");
    expect(moved.tiles[JOKER].cell).toBe(b);
    expect(engine.rack.audit(moved)).toEqual([]);
  });
  it("ao confirmar vira a letra certa da casa, trava e pontua", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const placed = engine.insert(s, wordOf(cell).id, JOKER, cell);
    const r = engine.confirm(placed, "p");
    expect(r.gained).toBe(1);
    expect(r.returned).toBe(0);
    expect(r.session.letters[cell]).toBe(solution[cell]);
    expect(r.session.locked).toContain(cell);
    expect(r.session.owners[cell]).toBe("p");
    expect(r.session.tiles[JOKER]).toMatchObject({
      letter: solution[cell],
      cell,
    });
    expect(r.session.scores.p).toBe(1 + r.bonus);
    expect(engine.rack.audit(r.session)).toEqual([]);
  });
  it("devolvido ao banco antes de confirmar, continua curinga", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const placed = engine.insert(s, wordOf(cell).id, JOKER, cell);
    const back = engine.remove(placed, wordOf(cell), cell)!;
    expect(back.rack).toContain(JOKER);
    expect(back.tiles[JOKER].letter).toBe("?");
  });
  it("uma letra errada pendente na casa volta ao banco", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const wrong = s.rack.find((id) => s.tiles[id].letter !== solution[cell])!;
    const placed = engine.insert(s, wordOf(cell).id, wrong, cell);
    const r = engine.insert(placed, wordOf(cell).id, JOKER, cell);
    expect(r.letters[cell]).toBe("?");
    expect(r.rack).toContain(wrong);
    expect(engine.rack.audit(r)).toEqual([]);
  });
  it("recusa casa travada e curinga fora do banco", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const used = engine.confirm(
      engine.insert(s, wordOf(cell).id, JOKER, cell),
      "p",
    ).session;
    expect(engine.insert(used, wordOf(cell).id, JOKER, cell)).toBe(used);
    const none = engine.start("t", "medio");
    expect(engine.insert(none, wordOf(cell).id, JOKER, cell)).toBe(none);
  });
  it("fechar uma palavra com o curinga paga o bônus da palavra inteira", () => {
    const s = structuredClone(withJoker());
    const word = level.words.find((w) => positions(w).length === 2)!;
    const [first, open] = positions(word);
    engine.rack.lockCell(s, first.key, "p");
    const placed = engine.insert(s, word.id, JOKER, open.key);
    const r = engine.confirm(placed, "p");
    expect(engine.solved(r.session).map((w) => w.id)).toContain(word.id);
    expect(r.bonus).toBeGreaterThanOrEqual(1);
    expect(r.session.scores.p).toBe(1 + r.bonus);
  });
  it("não pode ser trocado e não é gasto pela Dica", () => {
    let s = withJoker();
    expect(engine.swap(s, [JOKER])).toBeUndefined();
    const word = level.words[0];
    for (let i = 0; i < 4; i++) s = engine.hint(s, word.id) ?? s;
    expect(s.rack).toContain(JOKER);
    expect(s.tiles[JOKER].letter).toBe("?");
  });
});

describe("Curinga: na tela", () => {
  function open(path = "/play/vila-1?vs=medio") {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), tutorialDone: true },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }
  const key = "vs:vila-1:medio";
  /** Joga uma peça (a sessão só é gravada na primeira jogada) e põe o curinga no banco. */
  const inject = () => {
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    act(() =>
      usePlayer.setState((st) => {
        const s = st.player.sessions[key];
        return {
          player: {
            ...st.player,
            sessions: {
              ...st.player.sessions,
              [key]: {
                ...s,
                supply: s.supply.filter((id) => id !== JOKER),
                rack: [...s.rack, JOKER],
              },
            },
          },
        };
      }),
    );
  };
  const session = () => usePlayer.getState().player.sessions[key];

  it("o curinga aparece como peça especial no banco", () => {
    open();
    inject();
    const tile = screen.getByRole("button", { name: "Inserir curinga" });
    expect(tile).toHaveTextContent("★");
    expect(tile).toHaveClass("joker");
  });
  it("tocar no curinga só põe a estrela na casa; a letra aparece ao confirmar", () => {
    open();
    inject();
    fireEvent.click(screen.getByRole("button", { name: "Inserir curinga" }));
    let s = session();
    const cell = s.tiles[JOKER].cell!;
    expect(cell).toBeTruthy();
    expect(s.locked).not.toContain(cell);
    expect(s.letters[cell]).toBe("?");
    expect(s.scores.p).toBe(0);
    const [r, c] = cell.split(",").map(Number);
    const el = document.querySelector(`[data-cell="${r},${c}"]`)!;
    expect(el).toHaveClass("joker-cell", "pending", "joker-hidden");
    expect(el).toHaveTextContent("★");
    expect(el).toHaveAttribute(
      "aria-label",
      `Linha ${r + 1}, coluna ${c + 1}: curinga`,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar/ }));
    s = session();
    expect(s.locked).toContain(cell);
    expect(s.letters[cell]).toBe(solution[cell]);
    expect(s.tiles[JOKER].letter).toBe(solution[cell]);
  });
  it("arrastar o curinga para uma casa qualquer o deixa pendente nela", () => {
    open();
    inject();
    const cell = "3,6";
    const [r, c] = cell.split(",").map(Number);
    const target = document.querySelector(
      `[aria-label="Linha ${r + 1}, coluna ${c + 1}: vazia"]`,
    )!;
    const tile = screen.getByRole("button", { name: "Inserir curinga" });
    vi.spyOn(document, "elementFromPoint").mockReturnValue(target);
    fireEvent.pointerDown(tile, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 50,
      clientY: 500,
    });
    fireEvent.pointerMove(tile, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 250,
    });
    fireEvent.pointerUp(tile, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 100,
      clientY: 250,
    });
    expect(session().letters[cell]).toBe("?");
    expect(session().tiles[JOKER].cell).toBe(cell);
    expect(session().locked).not.toContain(cell);
  });
});
