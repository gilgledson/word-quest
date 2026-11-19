import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels, levelVariants } from "../data/catalog";
import {
  DICA_MAX_CHARS,
  PuzzleValidator,
  normalize,
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
afterEach(cleanup);

const level = levels[0];

describe("Pista completa (dica)", () => {
  it("toda palavra das fases e variantes tem uma, curta e sem a resposta", () => {
    for (const grid of [...levels, ...levelVariants])
      for (const w of grid.words) {
        expect(w.dica, `${grid.id}: ${w.answer}`).toBeTruthy();
        expect(w.dica!.length).toBeLessThanOrEqual(DICA_MAX_CHARS);
        expect(normalize(w.dica!).split(/[^A-Z]+/)).not.toContain(
          normalize(w.answer),
        );
      }
  });
  it("o validador recusa dica vazia, longa ou com a resposta", () => {
    const withDica = (dica: string) => ({
      ...level,
      words: level.words.map((w, i) => (i === 0 ? { ...w, dica } : w)),
    });
    const answer = level.words[0].answer;
    expect(PuzzleValidator.validate(withDica("  "))).toContain(
      "Pista completa vazia",
    );
    expect(
      PuzzleValidator.validate(withDica("x".repeat(DICA_MAX_CHARS + 1))),
    ).toContain("Pista completa longa");
    expect(
      PuzzleValidator.validate(withDica(`Começa como ${answer.toLowerCase()}`)),
    ).toContain("Pista completa com a resposta");
  });
  it("o painel mostra a dica da palavra selecionada; a casa da grade, o rótulo curto", () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), tutorialDone: true },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={[`/play/${level.id}`]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    const panel = document.querySelector(".selected-word")!;
    expect(panel).toHaveClass("has-dica");
    const heading = panel.querySelector("h2")!;
    const word = level.words.find((w) => heading.textContent === w.dica);
    expect(word).toBeDefined();
    // O rótulo curto continua na casa de pista da grade.
    expect(
      screen.getAllByText(word!.clue, { selector: ".board *" }).length,
    ).toBeGreaterThan(0);
  });
});
