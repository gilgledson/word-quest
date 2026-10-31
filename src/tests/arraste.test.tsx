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
import { RETURN_MS } from "../hooks/useLetterDrag";
import { levels } from "../data/catalog";
import { positions } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const solution: Record<string, string> = {};
for (const w of levels[0].words)
  for (const c of positions(w)) solution[c.key] = c.letter;

function open() {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), tutorialDone: true },
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
const rackTile = () =>
  screen.getAllByRole("button", { name: /^Inserir letra/ })[0];
/** Dá ao banco um retângulo de verdade (o jsdom não tem layout). */
const give = (el: Element, left: number, top: number) =>
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left,
    top,
    width: 60,
    height: 70,
    right: left + 60,
    bottom: top + 70,
    x: left,
    y: top,
    toJSON: () => ({}),
  });
const pointer = (tile: Element, type: string, x: number, y: number) =>
  fireEvent[type as "pointerMove"](tile, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: x,
    clientY: y,
  });
function drag(tile: Element, to: Element | null) {
  vi.spyOn(document, "elementFromPoint").mockReturnValue(to);
  pointer(tile, "pointerDown", 50, 500);
  pointer(tile, "pointerMove", 120, 300);
}
const ghost = () => document.querySelector<HTMLElement>(".drag-letter-ghost");

describe("Arrastar uma letra", () => {
  it("o lugar da letra fica vazio enquanto ela está no ar", () => {
    open();
    const tile = rackTile();
    drag(tile, null);
    expect(ghost()).toBeInTheDocument();
    expect(tile).toHaveClass("drag-source");
  });
  it("soltar numa casa aceita: o fantasma some na hora e a letra fica na casa", () => {
    vi.useFakeTimers();
    open();
    const tile = rackTile();
    give(tile, 10, 700);
    const letter = tile.getAttribute("aria-label")!.slice(-1);
    const key = Object.keys(solution).find((k) => solution[k] === letter)!;
    const [r, c] = key.split(",").map(Number);
    const target = document.querySelector(
      `[aria-label="Linha ${r + 1}, coluna ${c + 1}: vazia"]`,
    )!;
    drag(tile, target);
    pointer(tile, "pointerUp", 120, 300);
    expect(ghost()).toBeNull();
    expect(
      screen.getByRole("button", {
        name: `Linha ${r + 1}, coluna ${c + 1}: ${letter}`,
      }),
    ).toBeInTheDocument();
  });
  it("soltar fora da grade: o fantasma voa de volta ao banco e só então a letra reaparece", () => {
    vi.useFakeTimers();
    open();
    const tile = rackTile();
    give(tile, 10, 700); // centro em (40, 735)
    drag(tile, null);
    pointer(tile, "pointerUp", 120, 300);
    // Ainda no ar, a caminho do lugar de origem.
    expect(ghost()).toBeInTheDocument();
    expect(ghost()!.style.transform).toContain("translate3d(40px, 747px, 0)");
    expect(ghost()!.style.transition).toContain(`${RETURN_MS}ms`);
    expect(tile).toHaveClass("drag-source");
    act(() => {
      vi.advanceTimersByTime(RETURN_MS + 40);
    });
    expect(ghost()).toBeNull();
    expect(tile).not.toHaveClass("drag-source");
  });
  it("soltar numa pista também volta voando", () => {
    vi.useFakeTimers();
    open();
    const tile = rackTile();
    give(tile, 10, 700);
    drag(tile, screen.getAllByRole("button", { name: /^Pista:/ })[0]);
    pointer(tile, "pointerUp", 120, 300);
    expect(ghost()).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(RETURN_MS + 40);
    });
    expect(ghost()).toBeNull();
  });
  it("começar outro arrasto durante o voo de volta o encerra e não deixa fantasma duplicado", () => {
    vi.useFakeTimers();
    open();
    const tile = rackTile();
    give(tile, 10, 700);
    drag(tile, null);
    pointer(tile, "pointerUp", 120, 300);
    expect(ghost()).toBeInTheDocument();
    drag(tile, null);
    expect(document.querySelectorAll(".drag-letter-ghost")).toHaveLength(1);
    pointer(tile, "pointerCancel", 120, 300);
  });
  it("sem espaço medido para voltar (ou com movimento reduzido) a letra volta sem animar", () => {
    open();
    const tile = rackTile();
    drag(tile, null);
    pointer(tile, "pointerUp", 120, 300);
    expect(ghost()).toBeNull();
    expect(tile).not.toHaveClass("drag-source");
  });
});
