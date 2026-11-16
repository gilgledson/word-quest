import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialPlayer } from "../services/repository";

const plugin = vi.hoisted(() => ({
  status: vi.fn(),
  signIn: vi.fn(),
  unlock: vi.fn(),
  submitScore: vi.fn(),
  showAchievements: vi.fn(),
  showLeaderboard: vi.fn(),
  loadSave: vi.fn(),
  writeSave: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => plugin,
}));
vi.mock("../services/repository", async (original) => ({
  ...(await original<typeof import("../services/repository")>()),
  repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
}));

import {
  PlayGamesCard,
  PlayGamesSync,
  TOAST_MS,
  usePlayGamesStatus,
} from "../features/PlayGamesCard";
import { cloudText } from "../game/cloudSave";
import { usePlayer } from "../stores/player";

const PHOTO = "data:image/png;base64,AAAA";
beforeEach(() => {
  vi.useFakeTimers();
  Object.values(plugin).forEach((f) =>
    f.mockReset().mockResolvedValue(undefined),
  );
  plugin.status.mockResolvedValue({
    configured: true,
    signedIn: true,
    name: "asterflay",
    photo: PHOTO,
  });
  plugin.loadSave.mockResolvedValue({ data: "" });
  usePlayGamesStatus.setState({ configured: false, signedIn: false }, true);
  usePlayer.setState({
    player: structuredClone(initialPlayer),
    ready: true,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

describe("login do Play Games refletido no jogo", () => {
  it("avisa ao conectar, com o nome da conta, e o aviso some sozinho", async () => {
    render(<PlayGamesSync />);
    expect(screen.queryByRole("status")).toBeNull();
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Conectado ao Google Play Games como asterflay",
    );
    await act(() => vi.advanceTimersByTimeAsync(TOAST_MS));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sem login não há aviso", async () => {
    plugin.status.mockResolvedValue({ configured: true, signedIn: false });
    render(<PlayGamesSync />);
    await settle();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("o cartão do Perfil mostra a foto e o nome da conta conectada", async () => {
    usePlayGamesStatus.setState({
      configured: true,
      signedIn: true,
      name: "asterflay",
      photo: PHOTO,
    });
    const { container } = render(<PlayGamesCard />);
    expect(container.querySelector("img")).toHaveAttribute("src", PHOTO);
    expect(container).toHaveTextContent("Conectado como asterflay.");
    expect(screen.getByRole("button", { name: "Conquistas" })).toBeVisible();
  });

  it("quem ainda se chama Explorador ganha o nome do Play Games", async () => {
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.name).toBe("asterflay");
  });

  it("o nome vem do Play Games mesmo quando a leitura da nuvem falha", async () => {
    plugin.loadSave.mockRejectedValue(new Error("sem rede"));
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.name).toBe("asterflay");
  });

  it("a conta fica guardada no aparelho e o cartão a mostra antes de o Play Games responder", async () => {
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.playGames).toEqual({
      name: "asterflay",
      photo: PHOTO,
    });
    cleanup();
    // Próxima abertura: o Play Games ainda não respondeu (ou está sem internet).
    usePlayGamesStatus.setState({ configured: false, signedIn: false }, true);
    const { container } = render(<PlayGamesCard />);
    expect(container).toHaveTextContent("Conectado como asterflay.");
    expect(container.querySelector("img")).toHaveAttribute("src", PHOTO);
    // Respondeu que não está conectado: o cartão oferece entrar de novo, citando a conta.
    act(() =>
      usePlayGamesStatus.setState({
        configured: true,
        signedIn: false,
        checked: true,
      }),
    );
    expect(container).toHaveTextContent("Você saiu da conta asterflay.");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  it("quem segue o nome da conta acompanha a troca de nome no Play Games", async () => {
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        name: "antigo",
        playGames: { name: "antigo" },
      },
      ready: true,
    });
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.name).toBe("asterflay");
  });

  it("um nome já escolhido, no aparelho ou na conta, não é trocado", async () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), name: "Gil" },
      ready: true,
    });
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.name).toBe("Gil");
    cleanup();

    // Aparelho novo, com nome salvo na conta: vale o da conta, não o do Play Games.
    usePlayGamesStatus.setState({ configured: false, signedIn: false }, true);
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    plugin.loadSave.mockResolvedValue({
      data: cloudText({ ...initialPlayer, name: "Bia", avatar: "panda" }),
    });
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.name).toBe("Bia");
  });
});
