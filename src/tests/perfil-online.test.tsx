import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnlineMatchRoute, OnlineSetupRoute } from "../features/OnlinePage";
import { needsProfile } from "../game/avatars";
import { startOnline, type OnlineRoom } from "../game/online";
import { levels } from "../data/catalog";
import { memoryBackend, setOnlineBackend } from "../services/online";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

describe("quem precisa escolher nome e avatar", () => {
  it("só quem está com os padrões e nunca confirmou", () => {
    const base = { name: "Explorador", avatar: "jogador" };
    expect(needsProfile(base)).toBe(true);
    expect(needsProfile({ ...base, name: "  " })).toBe(true);
    expect(needsProfile({ ...base, profileSet: true })).toBe(false);
    expect(needsProfile({ ...base, name: "Bia" })).toBe(false);
    expect(needsProfile({ ...base, avatar: "panda" })).toBe(false);
  });
});

describe("nome e avatar antes do duelo ao vivo", () => {
  let mem: ReturnType<typeof memoryBackend>;
  const puzzle = levels[0];
  beforeEach(() => {
    mem = memoryBackend();
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        animations: false,
        sound: false,
        music: false,
      } as Player,
      ready: true,
    });
  });
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
  });
  const open = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="online/nova" element={<OnlineSetupRoute />} />
          <Route path="online/:code" element={<OnlineMatchRoute />} />
        </Routes>
      </MemoryRouter>,
    );

  it("o convidado escolhe nome e avatar e só então entra na sala, com eles", async () => {
    const room: OnlineRoom = {
      code: "ABC234",
      puzzleId: puzzle.id,
      host: { uid: "h", name: "Gil", avatar: "jogador" },
      status: "waiting",
      rev: 0,
      state: startOnline(puzzle.id, "semente"),
    };
    await mem.as("h").create(room);
    setOnlineBackend(mem.as("guest"));
    open("/online/ABC234");
    expect(
      screen.getByRole("heading", { name: "Quem vai jogar?" }),
    ).toBeInTheDocument();
    // Ninguém entrou na sala ainda.
    expect(mem.rooms.get("ABC234")!.guest).toBeUndefined();
    const go = screen.getByRole("button", { name: /Entrar no duelo/ });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Panda" }));
    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "  Bia   Souza " },
    });
    expect(go).toBeEnabled();
    await act(async () => {
      fireEvent.click(go);
    });
    const p = usePlayer.getState().player;
    expect(p).toMatchObject({
      name: "Bia Souza",
      avatar: "panda",
      profileSet: true,
    });
    await screen.findByRole("heading", { name: "Contra Gil" });
    expect(mem.rooms.get("ABC234")!.guest).toMatchObject({
      name: "Bia Souza",
      avatar: "panda",
    });
  });

  it("quem já tem nome vai direto para a configuração da partida", () => {
    usePlayer.setState((s) => ({
      player: { ...s.player, name: "Gil" },
    }));
    open("/online/nova");
    expect(
      screen.queryByRole("heading", { name: "Quem vai jogar?" }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Configurar partida" }),
    ).toBeInTheDocument();
  });

  it("criar partida também pede o nome antes, com o botão Continuar", () => {
    open("/online/nova");
    fireEvent.change(screen.getByLabelText("Seu nome"), {
      target: { value: "Gil" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(
      screen.getByRole("heading", { name: "Configurar partida" }),
    ).toBeInTheDocument();
  });
});
