import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const played: boolean[] = [];
class FakeAudio {
  loop = false;
  volume = 1;
  preload = "";
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    played.push(true);
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
    played.push(false);
  });
}
afterEach(cleanup);
beforeEach(() => {
  played.length = 0;
  vi.resetModules();
  vi.stubGlobal("Audio", FakeAudio);
});

let usePlayer: typeof import("../stores/player").usePlayer;
async function open(path: string, music = true) {
  // O módulo da música guarda estado: importa tudo de novo a cada teste, já com o Audio falso.
  const { MusicController: Controller } =
    await import("../components/MusicController");
  const { Layout } = await import("../components/Layout");
  const { initialPlayer } = await import("../services/repository");
  ({ usePlayer } = await import("../stores/player"));
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), music },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Controller />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Link to="/play/vila-1">jogar</Link>} />
          <Route path="play/:id" element={<p>tabuleiro</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Ícone de música e silêncio no tabuleiro", () => {
  it("o topo tem um botão que desliga e liga a música", async () => {
    await open("/");
    const off = screen.getByRole("button", { name: "Desligar música" });
    fireEvent.click(off);
    expect(usePlayer.getState().player.music).toBe(false);
    expect(played.at(-1)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Ligar música" }));
    expect(usePlayer.getState().player.music).toBe(true);
    expect(played.at(-1)).toBe(true);
  });
  it("no tabuleiro a música para e o botão some", async () => {
    await open("/");
    expect(played.at(-1)).toBe(true);
    fireEvent.click(screen.getByRole("link", { name: "jogar" }));
    expect(played.at(-1)).toBe(false);
    expect(screen.queryByRole("button", { name: /música/ })).toBeNull();
    // A preferência continua ligada para quando o jogador sair da partida.
    expect(usePlayer.getState().player.music).toBe(true);
  });
  it("abrir direto no tabuleiro não toca nada", async () => {
    await open("/play/vila-1");
    expect(played).not.toContain(true);
  });
  it("com a música desligada nada toca", async () => {
    await open("/", false);
    expect(played).not.toContain(true);
  });
});
