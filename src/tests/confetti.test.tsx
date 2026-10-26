import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { levels } from "../data/catalog";
import { PuzzlePage } from "../features/PuzzlePage";
import { PuzzleEngine, positions } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

const fire = vi.fn();
vi.mock("canvas-confetti", () => ({ default: (o: unknown) => fire(o) }));
afterEach(cleanup);
beforeEach(() => {
  fire.mockClear();
});

describe("Confete da vitória", () => {
  it("dispara quando as animações estão ligadas e some quando desligadas", async () => {
    const { celebrate } = await import("../services/confetti");
    await celebrate(false);
    expect(fire).not.toHaveBeenCalled();
    await celebrate(true);
    expect(fire).toHaveBeenCalled();
    // Espera as rajadas laterais, para não vazarem para o teste seguinte.
    await new Promise((r) => setTimeout(r, 400));
    expect(fire.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
  it("vencer o duelo solta confete; só passar a vez não", async () => {
    const puzzle = levels[0];
    const engine = new PuzzleEngine(puzzle);
    const solution: Record<string, string> = {};
    for (const w of puzzle.words)
      for (const c of positions(w)) solution[c.key] = c.letter;
    const keys = Object.keys(solution);
    const last = keys.at(-1)!;
    let s = engine.start("vs:vila-1:medio", "medio");
    s = engine.play(s, keys.slice(0, -1), "p")!.session;
    const tile = s.rack.find((id) => s.tiles[id].letter === solution[last]);
    const word = puzzle.words.find((w) =>
      positions(w).some((c) => c.key === last),
    )!;
    expect(tile).toBeTruthy();
    s = engine.insert(s, word.id, tile!, last);
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        sessions: { "vs:vila-1:medio": s },
      },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(fire).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    });
    await screen.findByText("Você venceu o duelo!");
    await vi.waitFor(() => expect(fire).toHaveBeenCalled());
  });
});
