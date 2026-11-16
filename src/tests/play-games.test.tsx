import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { initialPlayer, type Player } from "../services/repository";
import { levels } from "../data/catalog";

const plugin = vi.hoisted(() => ({
  status: vi.fn(),
  signIn: vi.fn(),
  unlock: vi.fn(),
  submitScore: vi.fn(),
  showAchievements: vi.fn(),
  showLeaderboard: vi.fn(),
}));
const native = vi.hoisted(() => ({ value: true }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.value },
  registerPlugin: () => plugin,
}));
vi.mock("../game/playGamesIds", () => ({
  PLAY_ACHIEVEMENTS: { "primeiro-passo": "CgkI_primeiro", "diario-1": "" },
  PLAY_LEADERBOARD_WORDS: "CgkI_palavras",
}));

import {
  playGamesSnapshot,
  playGamesStatus,
  resetPlayGamesSync,
  syncPlayGames,
} from "../services/playGames";
import { PlayGamesCard, usePlayGamesStatus } from "../features/PlayGamesCard";

const first = levels[0];
const winner: Player = {
  ...initialPlayer,
  stars: { [first.id]: 3 },
  daily: ["2026-11-14"],
  wordsFound: { [first.id]: first.words.slice(0, 4).map((w) => w.id) },
};

beforeEach(() => {
  Object.values(plugin).forEach((f) =>
    f.mockReset().mockResolvedValue(undefined),
  );
  native.value = true;
  resetPlayGamesSync();
  usePlayGamesStatus.setState({ configured: false, signedIn: false });
});

describe("Play Games", () => {
  it("espelha só as conquistas atingidas que têm id no Play Console", () => {
    expect(playGamesSnapshot(initialPlayer)).toEqual({ ids: [], words: 0 });
    // "diario-1" também foi atingida, mas ainda não tem id: fica só dentro do jogo.
    expect(playGamesSnapshot(winner)).toEqual({
      ids: ["CgkI_primeiro"],
      words: 4,
    });
  });

  it("envia cada conquista uma vez e o placar só quando cresce", async () => {
    await syncPlayGames(winner);
    expect(plugin.unlock).toHaveBeenCalledWith({ ids: ["CgkI_primeiro"] });
    expect(plugin.submitScore).toHaveBeenCalledWith({
      leaderboard: "CgkI_palavras",
      score: 4,
    });
    await syncPlayGames(winner);
    expect(plugin.unlock).toHaveBeenCalledTimes(1);
    expect(plugin.submitScore).toHaveBeenCalledTimes(1);
    await syncPlayGames({
      ...winner,
      wordsFound: { [first.id]: first.words.slice(0, 6).map((w) => w.id) },
    });
    expect(plugin.submitScore).toHaveBeenLastCalledWith({
      leaderboard: "CgkI_palavras",
      score: 6,
    });
  });

  it("uma falha de envio não quebra o jogo e é tentada de novo", async () => {
    plugin.unlock.mockRejectedValueOnce(new Error("sem rede"));
    await expect(syncPlayGames(winner)).resolves.toBeUndefined();
    await syncPlayGames(winner);
    expect(plugin.unlock).toHaveBeenCalledTimes(2);
  });

  it("no navegador responde desligado sem chamar o plugin", async () => {
    native.value = false;
    await expect(playGamesStatus()).resolves.toEqual({
      configured: false,
      signedIn: false,
    });
    expect(plugin.status).not.toHaveBeenCalled();
  });

  it("o cartão do Perfil some sem configuração e oferece Entrar ou os atalhos", async () => {
    const { container } = render(<PlayGamesCard />);
    expect(container).toBeEmptyDOMElement();

    usePlayGamesStatus.setState({ configured: true, signedIn: false });
    plugin.signIn.mockResolvedValue({ configured: true, signedIn: true });
    await waitFor(() => screen.getByRole("button", { name: "Entrar" }));
    screen.getByRole("button", { name: "Entrar" }).click();
    await waitFor(() => screen.getByRole("button", { name: "Conquistas" }));
    screen.getByRole("button", { name: "Conquistas" }).click();
    expect(plugin.showAchievements).toHaveBeenCalled();
    screen.getByRole("button", { name: "Placar" }).click();
    expect(plugin.showLeaderboard).toHaveBeenCalledWith({
      leaderboard: "CgkI_palavras",
    });
  });
});
