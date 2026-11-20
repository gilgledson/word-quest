import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import {
  economy,
  PuzzleEngine,
  roundOf,
  type Session,
} from "../game/crossword-engine";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => cleanup());

const engine = new PuzzleEngine(levels[0]);
const short = (patch: Partial<Session["versus"]>): Session => {
  const s = engine.start("t", "facil");
  return { ...s, versus: { ...s.versus, rounds: 6, ...patch } };
};

describe("duelo curto (primeiro duelo)", () => {
  it("termina quando o oponente fecha a última rodada, mesmo com a grade aberta", () => {
    expect(engine.complete(short({ rngCount: 5, turn: "p" }))).toBe(false);
    expect(engine.complete(short({ rngCount: 5, turn: "ai" }))).toBe(false);
    expect(engine.complete(short({ rngCount: 6, turn: "ai" }))).toBe(false);
    expect(engine.complete(short({ rngCount: 6, turn: "p" }))).toBe(true);
    expect(roundOf(short({ rngCount: 0 }))).toEqual({ round: 1, rounds: 6 });
    expect(roundOf(short({ rngCount: 6 }))).toEqual({ round: 6, rounds: 6 });
  });
  it("sem rodadas, só a grade inteira encerra", () => {
    const s = engine.start("t", "facil");
    expect(roundOf(s)).toBeUndefined();
    expect(
      engine.complete({ ...s, versus: { ...s.versus, rngCount: 40 } }),
    ).toBe(false);
  });
});

const key = "vs:vila-1:facil";
function open(patch: Partial<Player> = {}) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), ...patch },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={["/play/vila-1"]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("primeiro duelo na tela", () => {
  it("o jogador novo começa um duelo de poucas rodadas e vê a rodada no topo", () => {
    open();
    expect(
      screen.getByLabelText(`Rodada 1 de ${economy.firstDuelRounds}`),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/palavras fechadas/)).toBeNull();
  });
  it("quem já fez o tutorial joga a grade inteira", () => {
    open({ tutorialDone: true });
    expect(screen.getByLabelText(/palavras fechadas/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Rodada/)).toBeNull();
  });
  it("vencer o duelo curto convida para o duelo online; quem já chamou amigo não vê", () => {
    const won = {
      ...short({ rngCount: 6, turn: "p" }),
      scores: { p: 20, ai: 4 },
    };
    open({ tutorialDone: true, sessions: { [key]: won } });
    expect(screen.getByText("Você venceu!")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Desafiar um amigo online" }),
    ).toHaveAttribute("href", "/online");
    cleanup();
    open({
      tutorialDone: true,
      invitedFriends: ["amigo"],
      sessions: { [key]: won },
    });
    expect(screen.getByText("Você venceu!")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Desafiar um amigo online" }),
    ).toBeNull();
  });
});
