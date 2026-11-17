import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { positions } from "../game/crossword-engine";
import { tutorialWord } from "../features/puzzle/tutorialPick";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
const tracked = vi.hoisted(() => [] as { name: string; params?: object }[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: object) => tracked.push({ name, params }),
  };
});
beforeEach(() => {
  tracked.length = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const word = tutorialWord(levels[0])!;
const cells = positions(word);
const key = "vs:vila-1:medio";
function open(patch: Partial<Player> = {}) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), ...patch },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const session = () => usePlayer.getState().player.sessions[key];
const guide = () => screen.queryByRole("region", { name: "Tutorial" });
const cellEl = (k: string) =>
  document.querySelector<HTMLElement>(`.board [data-cell="${k}"]`)!;
const tileOf = (letter: string) =>
  screen.getAllByRole("button", { name: `Inserir letra ${letter}` })[0];
/** Arrasta a peça até o elemento (o ponto de soltura é simulado com `elementFromPoint`). */
function dragTo(letter: string, target: Element | null) {
  const tile = tileOf(letter);
  vi.spyOn(document, "elementFromPoint").mockReturnValue(target);
  fireEvent.pointerDown(tile, {
    pointerId: 1,
    button: 0,
    clientX: 50,
    clientY: 500,
  });
  fireEvent.pointerMove(tile, { pointerId: 1, clientX: 100, clientY: 250 });
  fireEvent.pointerUp(tile, { pointerId: 1, clientX: 100, clientY: 250 });
}
const letterAt = (k: string) => session()?.letters[k];

describe("primeira jogada guiada do tutorial", () => {
  it("o banco tem as letras da palavra e o balão diz qual é e quantas faltam", () => {
    open();
    const bank = screen
      .getAllByRole("button", { name: /^Inserir letra/ })
      .map((b) => b.textContent)
      .sort()
      .join("");
    expect(bank).toBe(
      cells
        .map((c) => c.letter)
        .sort()
        .join(""),
    );
    expect(guide()).toHaveTextContent(`formar ${word.answer}`);
    expect(guide()).toHaveTextContent(`Próxima letra: ${cells[0].letter}`);
    expect(guide()).toHaveTextContent(`0 de ${cells.length} letras`);
    // Trocar e Dica ficam desligados durante a jogada guiada.
    expect(screen.getByRole("button", { name: "Trocar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dica" })).toBeDisabled();
  });
  it("letra errada numa casa e casa fora da palavra são recusadas", () => {
    open();
    const first = cells[0];
    const other = cells.find((c) => c.letter !== first.letter)!;
    // Letra que não é a da casa.
    dragTo(other.letter, cellEl(first.key));
    expect(letterAt(first.key)).toBeUndefined();
    expect(
      screen.getByText(`Essa casa pede o ${first.letter}.`),
    ).toBeInTheDocument();
    // Casa de outra palavra (fora da guiada).
    const outside = levels[0].words
      .flatMap((w) => positions(w))
      .find((c) => !cells.some((x) => x.key === c.key))!;
    dragTo(first.letter, cellEl(outside.key));
    expect(letterAt(outside.key)).toBeUndefined();
    // A letra certa na casa certa entra.
    dragTo(first.letter, cellEl(first.key));
    expect(letterAt(first.key)).toBe(first.letter);
    expect(guide()).toHaveTextContent(`1 de ${cells.length} letras`);
  });
  it("outra pista não tira a seleção da palavra guiada", () => {
    open();
    const otherClue = levels[0].words.find((w) => w.id !== word.id)!;
    fireEvent.click(
      screen.getAllByRole("button", {
        name: `Pista: ${otherClue.clue}, ${otherClue.direction}`,
      })[0],
    );
    expect(
      screen.getByText(`Monte ${word.answer} primeiro.`),
    ).toBeInTheDocument();
    expect(document.querySelector(".selected-clue")).toHaveTextContent(
      word.clue,
    );
  });
  it("tocar a letra põe na casa que a pede (qualquer ordem) e tocar a casa devolve a letra", () => {
    open();
    const last = cells[cells.length - 1];
    fireEvent.click(tileOf(last.letter));
    const placed = cells.find((c) => letterAt(c.key));
    expect(placed?.letter).toBe(last.letter);
    fireEvent.click(cellEl(placed!.key));
    expect(letterAt(placed!.key)).toBeUndefined();
    expect(guide()).toHaveTextContent(`0 de ${cells.length} letras`);
  });
  it("✓ só com a palavra inteira; o balão promete o ganho real; confirmar soma e o guia some", () => {
    open();
    expect(screen.getByRole("button", { name: /Passar a vez/ })).toBeDisabled();
    for (const c of cells) fireEvent.click(tileOf(c.letter));
    const promised = Number(guide()!.textContent!.match(/\+(\d+) pontos/)![1]);
    const confirm = screen.getByRole("button", { name: /^Confirmar/ });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(session().scores.p).toBe(promised);
    expect(guide()).toBeNull();
    expect(tracked.filter((t) => t.name === "tutorial_word_done")).toHaveLength(
      1,
    );
    expect(usePlayer.getState().player.tipsSeen).toContain("palavra");
  });
  it("reabrir no meio retoma do estado salvo, sem mexer no banco nem duplicar peças", () => {
    open();
    fireEvent.click(tileOf(cells[0].letter));
    fireEvent.click(tileOf(cells[1].letter));
    const saved = structuredClone(session());
    cleanup();
    render(
      <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(guide()).toHaveTextContent(`2 de ${cells.length} letras`);
    expect(session().rack).toEqual(saved.rack);
    expect(Object.keys(session().tiles)).toHaveLength(
      Object.keys(saved.tiles).length,
    );
  });
  it("Pular (antes ou depois de pôr letras) encerra e conta onde parou; as letras ficam", () => {
    open();
    fireEvent.click(tileOf(cells[0].letter));
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(usePlayer.getState().player.tutorialDone).toBe(true);
    expect(guide()).toBeNull();
    expect(letterAt(cells[0].key)).toBe(cells[0].letter);
    expect(tracked.find((t) => t.name === "tutorial_skipped")?.params).toEqual({
      step: "word",
      letters_placed: 1,
      word_length: cells.length,
    });
  });
  it("um arraste em andamento é encerrado ao pular, sem soltar a peça", () => {
    open();
    const tile = tileOf(cells[0].letter);
    fireEvent.pointerDown(tile, {
      pointerId: 1,
      button: 0,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(tile, { pointerId: 1, clientX: 80, clientY: 80 });
    expect(document.querySelector(".drag-letter-ghost")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(document.querySelector(".drag-letter-ghost")).toBeNull();
    expect(letterAt(cells[0].key)).toBeUndefined();
  });
  it("perder o foco no meio do arraste encerra o gesto", () => {
    open();
    const tile = tileOf(cells[0].letter);
    fireEvent.pointerDown(tile, {
      pointerId: 1,
      button: 0,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(tile, { pointerId: 1, clientX: 80, clientY: 80 });
    expect(document.querySelector(".drag-letter-ghost")).not.toBeNull();
    fireEvent(window, new Event("blur"));
    expect(document.querySelector(".drag-letter-ghost")).toBeNull();
  });
  it("quem já fez o tutorial joga normal: banco sorteado, sem guia", () => {
    open({ tutorialDone: true });
    expect(guide()).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /^Inserir letra/ }),
    ).toHaveLength(5);
  });
});
