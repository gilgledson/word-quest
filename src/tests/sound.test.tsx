import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { EFFECTS, playSfx, type EffectName } from "../services/sound";
import { PuzzlePage } from "../features/PuzzlePage";
import { Profile } from "../features/pages";
import { initialPlayer, repository } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

const started: { freq: number; at: number }[] = [];
class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  resume = vi.fn();
  createGain() {
    const param = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    return { gain: param, connect: vi.fn() };
  }
  createOscillator() {
    const osc = {
      type: "sine",
      frequency: {
        value: 0,
        setValueAtTime: (f: number) => (osc.frequency.value = f),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: (at: number) => started.push({ freq: osc.frequency.value, at }),
      stop: vi.fn(),
    };
    return osc;
  }
}
beforeEach(() => {
  started.length = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Efeitos sonoros", () => {
  const names = Object.keys(EFFECTS) as EffectName[];
  it.each(names)("%s tem notas válidas", (name) => {
    const notes = EFFECTS[name](3);
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(n.f).toBeGreaterThan(50);
      expect(n.d).toBeGreaterThan(0);
      expect(n.t).toBeGreaterThanOrEqual(0);
      expect(n.v ?? 0.1).toBeLessThanOrEqual(0.2);
    }
  });
  it("não toca nada com os sons desligados", () => {
    playSfx(false, "win");
    expect(started).toHaveLength(0);
  });
  it("toca uma nota por oscilador, e o ✓ sobe um degrau por letra", () => {
    playSfx(true, "correct", 3);
    expect(started).toHaveLength(3);
    expect(started[1].freq).toBeGreaterThan(started[0].freq);
    expect(started[2].freq).toBeGreaterThan(started[1].freq);
  });
  it("o contexto suspenso é retomado e as notas só entram depois disso", async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    class Suspended extends FakeAudioContext {
      state = "suspended";
      resume = resume;
    }
    vi.resetModules();
    vi.stubGlobal("AudioContext", Suspended);
    const fresh = await import("../services/sound");
    fresh.playSfx(true, "place");
    expect(resume).toHaveBeenCalled();
    expect(started).toHaveLength(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toHaveLength(1);
  });
  it("sem WebAudio não lança erro", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => playSfx(true, "place")).not.toThrow();
  });
});

describe("Sons na partida", () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
  const open = (sound: boolean) => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), sound },
      ready: true,
    });
    mount();
  };
  const tile = () =>
    screen.getAllByRole("button", { name: /^Inserir letra/ })[0];
  it("o padrão é ligado", () => {
    expect(initialPlayer.sound).toBe(true);
  });
  it("colocar uma peça, remover e confirmar tocam sons", () => {
    open(true);
    fireEvent.click(tile());
    expect(started.length).toBeGreaterThan(0);
    const afterPlace = started.length;
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(started.length).toBeGreaterThan(afterPlace);
  });
  it("com os sons desligados a partida fica em silêncio", () => {
    open(false);
    fireEvent.click(tile());
    fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    expect(started).toHaveLength(0);
  });
  it("ações recusadas fazem o som de erro", () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), coins: 0 },
      ready: true,
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    expect(started).toHaveLength(EFFECTS.error().length);
  });
});

describe("Preferência de som", () => {
  it("o perfil liga e desliga e lembra a escolha", () => {
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    const toggle = screen.getByRole("checkbox", { name: /Efeitos sonoros/ });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(usePlayer.getState().player.sound).toBe(false);
    expect(usePlayer.getState().player.soundChosen).toBe(true);
  });
  it("o botão Testar som toca um efeito e fica desabilitado com o som desligado", () => {
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Testar som/ }));
    expect(started).toHaveLength(3);
    fireEvent.click(screen.getByRole("checkbox", { name: /Efeitos sonoros/ }));
    expect(screen.getByRole("button", { name: /Testar som/ })).toBeDisabled();
  });
  it("quem nunca escolheu recebe o padrão novo; quem escolheu mantém", async () => {
    vi.mocked(repository.load).mockResolvedValueOnce({
      ...structuredClone(initialPlayer),
      sound: false,
      soundChosen: false,
    });
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.sound).toBe(true);
    vi.mocked(repository.load).mockResolvedValueOnce({
      ...structuredClone(initialPlayer),
      sound: false,
      soundChosen: true,
    });
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.sound).toBe(false);
  });
});
