import fs from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { Casual } from "../features/pages";
import { PuzzlePage } from "../features/PuzzlePage";
import { casualThemes, casualPuzzles } from "../data/catalog";
import { PuzzleEngine, PuzzleValidator } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);
const Where = () => (
  <p data-testid="where">{useLocation().pathname + useLocation().search}</p>
);
function open(path = "/casual") {
  usePlayer.setState({
    player: structuredClone(initialPlayer),
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/casual" element={<Casual />} />
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Modo casual", () => {
  it("tem os quatro temas, cada um com várias grades válidas", () => {
    expect(casualThemes.map((t) => t.id)).toEqual([
      "animais",
      "comida",
      "natureza",
      "casa",
    ]);
    for (const t of casualThemes) {
      expect(t.puzzles.length).toBeGreaterThanOrEqual(5);
      for (const p of t.puzzles) {
        expect(PuzzleValidator.validateCasual(p)).toEqual([]);
        const engine = new PuzzleEngine(p);
        expect(engine.rack.audit(engine.start("t", "medio"))).toEqual([]);
      }
    }
    expect(new Set(casualPuzzles.map((p) => p.id)).size).toBe(
      casualPuzzles.length,
    );
  });
  it("toda resposta de cada grade é do tema (tipo no catálogo de palavras)", () => {
    const tipo = new Map<string, string>(
      (
        JSON.parse(fs.readFileSync("scripts/data/catalogo.json", "utf8")) as {
          palavra: string;
          tipo: string;
        }[]
      ).map((e) => [e.palavra, e.tipo]),
    );
    for (const t of casualThemes)
      for (const p of t.puzzles)
        for (const w of p.words)
          expect([t.id, w.answer, tipo.get(w.answer)]).toEqual([
            t.id,
            w.answer,
            t.id,
          ]);
  });
  it("as grades de um tema são todas diferentes", () => {
    for (const t of casualThemes) {
      const keys = t.puzzles.map((p) =>
        p.words
          .map((w) => w.answer)
          .sort()
          .join(","),
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("mostra os temas e abre um duelo ao escolher um", () => {
    open();
    expect(screen.getAllByRole("button", { name: /^Tema / })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Tema Animais" }));
    const where = screen.getByTestId("where").textContent!;
    expect(where).toMatch(/^\/play\/casual-animais-\d+\?vs=[a-z]+$/);
    expect(screen.getByText(/CASUAL · ANIMAIS/)).toBeInTheDocument();
  });
  it("o duelo casual não bloqueia por fase anterior e vencer não dá estrelas", () => {
    open("/play/casual-natureza-3?vs=medio");
    expect(screen.getByText(/CASUAL · NATUREZA/)).toBeInTheDocument();
    expect(screen.getByText("Grade 3")).toBeInTheDocument();
    expect(usePlayer.getState().player.stars).toEqual({});
  });
});
