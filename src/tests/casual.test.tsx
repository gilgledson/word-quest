import fs from "node:fs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { Casual } from "../features/pages";
import { CasualSetup } from "../features/CasualSetup";
import { PuzzlePage } from "../features/PuzzlePage";
import { casualThemes, casualPuzzles } from "../data/catalog";
import { OPPONENTS } from "../game/opponents";
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
        <Route path="/casual/nova" element={<CasualSetup />} />
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
  it("mostra os temas; Jogar abre a configuração com tamanho e adversário", () => {
    open();
    expect(
      screen.getAllByRole("button", { name: /^Jogar tema / }),
    ).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Jogar tema Animais" }));
    expect(screen.getByTestId("where").textContent).toBe(
      "/casual/nova?tema=animais",
    );
    expect(
      screen.getByRole("heading", { name: "Configurar partida" }),
    ).toBeInTheDocument();
    // Tamanho e adversário; sem aposta nem tempo por jogada.
    const sizes = screen.getByRole("radiogroup", {
      name: "Tamanho do tabuleiro",
    });
    expect(within(sizes).getAllByRole("radio")).toHaveLength(4);
    expect(
      within(sizes).getByRole("radio", { name: /^7×7, Médio/ }),
    ).toBeChecked();
    expect(screen.queryByRole("radiogroup", { name: "Aposta" })).toBeNull();
    expect(
      screen.queryByRole("radiogroup", { name: "Tempo por jogada" }),
    ).toBeNull();
    const rivals = screen.getByRole("radiogroup", { name: "Adversário" });
    // "Sorteio" vem marcado; os rivais do jogo vêm depois, com o nível.
    expect(
      within(rivals).getByRole("radio", { name: /^Sorteio/ }),
    ).toBeChecked();
    expect(within(rivals).getAllByRole("radio")).toHaveLength(
      OPPONENTS.length + 1,
    );
    fireEvent.click(within(rivals).getByRole("radio", { name: "Sabi, Médio" }));
    expect(
      screen.getByText("Partida contra Sabi, sem aposta."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    const where = screen.getByTestId("where").textContent!;
    // O tema tem grades em todos os tamanhos: no 7×7 a partida é uma grade do tema desse tamanho.
    expect(where).toMatch(/^\/play\/casual-[a-z]+-7x7-\d+\?vs=sabi$/);
    expect(screen.getAllByText("Sabi").length).toBeGreaterThan(0);
  });
  it("cada tamanho joga uma grade do tema escolhido, sem estrelas", () => {
    open("/casual/nova?tema=natureza");
    fireEvent.click(screen.getByRole("radio", { name: /^6×6, Rápido/ }));
    // O tema tem grades 6×6: a partida continua no tema.
    expect(screen.getByText(/Tema:/)).toHaveTextContent("Tema: Natureza");
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    const where = screen.getByTestId("where").textContent!;
    expect(where).toMatch(/^\/play\/casual-natureza-6x6-\d+\?vs=[a-z]+$/);
    expect(screen.getByText(/CASUAL · NATUREZA/)).toBeInTheDocument();
    expect(document.querySelectorAll(".board .cell")).toHaveLength(36);
    expect(usePlayer.getState().player.stars).toEqual({});
  });
  it("o duelo casual não bloqueia por fase anterior e vencer não dá estrelas", () => {
    open("/play/casual-natureza-3?vs=medio");
    expect(screen.getByText(/CASUAL · NATUREZA/)).toBeInTheDocument();
    expect(screen.getByText("Grade 3")).toBeInTheDocument();
    expect(usePlayer.getState().player.stars).toEqual({});
  });
});
