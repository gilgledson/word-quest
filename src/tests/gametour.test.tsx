import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { initialPlayer, repository } from "../services/repository";
import { usePlayer } from "../stores/player";
vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
type JoyProps = {
  run: boolean;
  steps: { target: string; title?: string }[];
  locale: Record<string, string>;
  options: { buttons: string[]; skipBeacon: boolean };
  onEvent: (e: { status: string }) => void;
};
const calls = () =>
  ((globalThis as { __joyride?: JoyProps[] }).__joyride ?? []) as JoyProps[];
/** Últimas props do tour de apresentação ou do tour do curinga. */
const last = (first: string) =>
  [...calls()].reverse().find((p) => p.steps[0].target === first)!;
const tipAt = (target: string) => last(target);
/** Alguma dica (qualquer uma) está rodando agora? */
const anyRunning = () => {
  const latest = new Map<string, JoyProps>();
  for (const c of calls()) latest.set(c.steps[0].target, c);
  return [...latest.values()].some((c) => c.run);
};
const jokerTour = () => last(".letter-bank button.joker");
/** A dica que está montada agora (ao terminar uma, o componente reinicia sem dica e com run=false). */
const currentTip = () =>
  calls()
    .filter((c) => c.steps[0].target !== ".letter-bank button.joker")
    .at(-1)!;
beforeEach(() => {
  (globalThis as { __joyride?: JoyProps[] }).__joyride = [];
});
afterEach(() => cleanup());

function open(
  patch: Partial<typeof initialPlayer> = {},
  path = "/play/vila-1?vs=medio",
) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), ...patch },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Dicas curtas da fase 1 (react-joyride)", () => {
  const seen = () => usePlayer.getState().player.tipsSeen;
  /** Primeira jogada guiada: toca as letras do banco (todas da palavra) e confirma. */
  const playGuided = () => {
    for (let i = 0; i < 6; i++) {
      if (
        document.querySelector(".coach")?.getAttribute("data-step") ===
        "confirm"
      )
        break;
      const tiles = screen.queryAllByRole("button", { name: /^Inserir letra/ });
      if (!tiles.length) break;
      fireEvent.click(tiles[0]);
    }
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar/ }));
  };
  it("na jogada guiada nenhuma dica abre: o guia já explica (a dica do início saiu da fase 1)", () => {
    open();
    expect(document.querySelector(".coach")).not.toBeNull();
    expect(anyRunning()).toBe(false);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    expect(anyRunning()).toBe(false);
  });
  it("a dica do duelo surge na primeira vez do rival, com um só passo em português; trocar e Dica na vez seguinte", () => {
    open();
    playGuided();
    const tip = tipAt(".versus-score");
    expect(tip.run).toBe(true);
    expect(tip.steps).toHaveLength(1);
    expect(tip.locale).toMatchObject({ last: "Entendi", skip: "Dispensar" });
    expect(tip.options.skipBeacon).toBe(true);
    act(() => tipAt(".versus-score").onEvent({ status: "finished" }));
    expect(seen()).toContain("duelo");
    // De volta à vez do jogador.
    act(() =>
      usePlayer.setState((st) => {
        const key = Object.keys(st.player.sessions)[0];
        const sess = st.player.sessions[key];
        return {
          player: {
            ...st.player,
            sessions: {
              ...st.player.sessions,
              [key]: { ...sess, versus: { ...sess.versus, turn: "p" } },
            },
          },
        };
      }),
    );
    expect(tipAt(".puzzle-tools").run).toBe(true);
  });
  it("‘Entendi’ marca só essa dica como vista; passos intermediários não a encerram", () => {
    open();
    playGuided();
    act(() => tipAt(".versus-score").onEvent({ status: "running" }));
    expect(seen()).not.toContain("duelo");
    expect(tipAt(".versus-score").run).toBe(true);
    act(() => tipAt(".versus-score").onEvent({ status: "finished" }));
    expect(seen()).toContain("duelo");
    expect(usePlayer.getState().player.tourDone).toBe(false);
    expect(currentTip().run).toBe(false);
  });
  it("‘Dispensar’ desliga todas as dicas", () => {
    open();
    playGuided();
    act(() => tipAt(".versus-score").onEvent({ status: "skipped" }));
    expect(usePlayer.getState().player.tourDone).toBe(true);
    expect(currentTip().run).toBe(false);
  });
  it("não roda para quem já fez o tutorial, nem fora da fase 1", () => {
    open({ tutorialDone: true });
    expect(anyRunning()).toBe(false);
    cleanup();
    (globalThis as { __joyride?: JoyProps[] }).__joyride = [];
    open({}, "/play/vila-2?vs=medio");
    expect(anyRunning()).toBe(false);
  });
  it("dispensar o tutorial no ‘Pular’ também encerra as dicas", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(anyRunning()).toBe(false);
  });
  it("jogador novo vê as dicas; quem já tinha progresso salvo não", async () => {
    const {
      tourDone: _t,
      tutorialDone: _d,
      tipsSeen: _s,
      ...old
    } = structuredClone(initialPlayer);
    void _t;
    void _d;
    void _s;
    vi.mocked(repository.load).mockResolvedValueOnce(
      old as typeof initialPlayer,
    );
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.tourDone).toBe(true);
    expect(usePlayer.getState().player.tipsSeen).toEqual([]);
    vi.mocked(repository.load).mockResolvedValueOnce(undefined);
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.tourDone).toBe(false);
  });
});

describe("Tour do curinga", () => {
  const key = "vs:vila-1:medio";
  const withJoker = () => {
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    act(() =>
      usePlayer.setState((st) => {
        const s = st.player.sessions[key];
        return {
          player: {
            ...st.player,
            sessions: {
              ...st.player.sessions,
              [key]: {
                ...s,
                supply: s.supply.filter((id) => id !== "joker"),
                rack: [...s.rack, "joker"],
              },
            },
          },
        };
      }),
    );
  };
  it("não roda sem curinga; roda uma vez quando ele chega e depois fica quieto", () => {
    open({ tutorialDone: true });
    expect(jokerTour().run).toBe(false);
    withJoker();
    expect(jokerTour().run).toBe(true);
    expect(jokerTour().steps[0].title).toMatch(/curinga/i);
    act(() => jokerTour().onEvent({ status: "finished" }));
    expect(usePlayer.getState().player.jokerTourDone).toBe(true);
    expect(jokerTour().run).toBe(false);
  });
  it("quem já viu a apresentação não a vê de novo", () => {
    open({ tutorialDone: true, jokerTourDone: true });
    withJoker();
    expect(jokerTour().run).toBe(false);
  });
});
