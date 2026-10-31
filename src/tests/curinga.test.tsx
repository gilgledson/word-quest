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
  it("vira a letra certa da casa, trava na hora e pontua", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const r = engine.joker(s, JOKER, cell)!;
    expect(r.gained).toBe(1);
    expect(r.session.letters[cell]).toBe(solution[cell]);
    expect(r.session.locked).toContain(cell);
    expect(r.session.owners[cell]).toBe("p");
    expect(r.session.tiles[JOKER]).toMatchObject({
      letter: solution[cell],
      cell,
    });
    expect(r.session.rack).not.toContain(JOKER);
    expect(r.session.scores.p).toBe(1 + r.bonus);
    expect(engine.rack.audit(r.session)).toEqual([]);
  });
  it("uma letra errada pendente na casa volta ao banco", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const wrong = s.rack.find((id) => s.tiles[id].letter !== solution[cell])!;
    const word = level.words.find((w) =>
      positions(w).some((c) => c.key === cell),
    )!;
    const placed = engine.insert(s, word.id, wrong, cell);
    const r = engine.joker(placed, JOKER, cell)!;
    expect(r.session.letters[cell]).toBe(solution[cell]);
    expect(r.session.rack).toContain(wrong);
    expect(engine.rack.audit(r.session)).toEqual([]);
  });
  it("recusa casa travada, letra pendente já certa, peça comum e curinga fora do banco", () => {
    const s = withJoker();
    const cell = emptyCell(s);
    const used = engine.joker(s, JOKER, cell)!.session;
    expect(engine.joker(used, JOKER, cell)).toBeUndefined();
    const right = s.rack.find((id) =>
      Object.values(solution).includes(s.tiles[id].letter),
    )!;
    const target = Object.keys(solution).find(
      (k) => solution[k] === s.tiles[right].letter,
    )!;
    const word = level.words.find((w) =>
      positions(w).some((c) => c.key === target),
    )!;
    const correct = engine.insert(s, word.id, right, target);
    expect(engine.joker(correct, JOKER, target)).toBeUndefined();
    expect(engine.joker(s, s.rack[0], cell)).toBeUndefined();
    expect(
      engine.joker(engine.start("t", "medio"), JOKER, cell),
    ).toBeUndefined();
  });
  it("fechar uma palavra com o curinga paga o bônus da palavra inteira", () => {
    let s = withJoker();
    const word = level.words.find((w) => positions(w).length === 2)!;
    s = engine.hint(s, word.id)!;
    const open = positions(word).find((c) => !s.locked.includes(c.key))!;
    const r = engine.joker(s, JOKER, open.key)!;
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
  it("tocar no curinga preenche a casa da palavra com a letra certa, sem encerrar a vez", () => {
    open();
    inject();
    const before = session().scores.p;
    fireEvent.click(screen.getByRole("button", { name: "Inserir curinga" }));
    const s = session();
    const cell = s.tiles[JOKER].cell!;
    expect(cell).toBeTruthy();
    expect(s.locked).toContain(cell);
    expect(s.letters[cell]).toBe(solution[cell]);
    expect(s.scores.p).toBeGreaterThan(before);
    expect(s.versus.turn).toBe("p");
    expect(
      screen.queryByRole("button", { name: "Inserir curinga" }),
    ).toBeNull();
    expect(screen.getByText(/Curinga virou/)).toBeInTheDocument();
    const [r, c] = cell.split(",").map(Number);
    expect(document.querySelector(`[data-cell="${r},${c}"]`)).toHaveClass(
      "joker-cell",
      "correct",
    );
  });
  it("arrastar o curinga para uma casa qualquer vira a letra dessa casa", () => {
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
    expect(session().letters[cell]).toBe(solution[cell]);
    expect(session().locked).toContain(cell);
  });
});
