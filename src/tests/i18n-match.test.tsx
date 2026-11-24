import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../i18n";
import { PuzzlePage } from "../features/PuzzlePage";
import { confirmMessage } from "../features/puzzle/messages";
import { medalsFor } from "../features/puzzle/summary";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

describe("Partida em inglês", () => {
  beforeEach(() => setLang("en"));
  afterEach(() => {
    cleanup();
    localStorage.clear();
    setLang("pt");
  });

  it("resume a jogada em inglês, com plural", () => {
    expect(confirmMessage({ won: 0, penalty: 1, returned: 1 })).toBe(
      "No right letters · −1 point · 1 letter went back to your rack",
    );
    expect(confirmMessage({ won: 3, penalty: 0, returned: 2 })).toBe(
      "+3 points · 2 letters went back to your rack",
    );
  });

  it("medalhas em inglês", () => {
    const medals = medalsFor({
      result: "win",
      scores: { p: 20, ai: 5 },
      letters: { p: 8, ai: 2 },
      helped: 0,
    });
    expect(medals.map((m) => m.label)).toEqual([
      "No help",
      "Easy win",
      "Board boss",
    ]);
  });

  it("mostra a partida em inglês", () => {
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
    expect(
      screen.getByText("Drag letters onto the squares, or tap to fill."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Swap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pass" })).toBeInTheDocument();
    expect(screen.getByText("◀ your turn")).toBeInTheDocument();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });
});
