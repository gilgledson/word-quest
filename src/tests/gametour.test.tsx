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
const gameTour = () => last(".board-area");
const jokerTour = () => last(".letter-bank button.joker");
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

describe("Tour de apresentação (react-joyride)", () => {
  it("roda na primeira vez da fase 1, com 4 passos em português", () => {
    open();
    const tour = gameTour();
    expect(tour.run).toBe(true);
    expect(tour.steps.map((s) => s.target)).toEqual([
      ".board-area",
      ".letter-bank",
      ".puzzle-tools",
      ".versus-score",
    ]);
    expect(tour.locale).toMatchObject({
      next: "Próximo",
      last: "Entendi",
      skip: "Dispensar",
    });
    expect(tour.options.buttons).toContain("skip");
    expect(tour.options.skipBeacon).toBe(true);
  });
  it("cada passo aponta para algo que existe na tela da partida", () => {
    open();
    for (const step of gameTour().steps)
      expect(document.querySelector(step.target), step.target).not.toBeNull();
  });
  it.each(["finished", "skipped"])(
    "ao %s, grava que o tour foi visto e para de rodar",
    (status) => {
      open();
      expect(usePlayer.getState().player.tourDone).toBe(false);
      act(() => gameTour().onEvent({ status }));
      expect(usePlayer.getState().player.tourDone).toBe(true);
      expect(gameTour().run).toBe(false);
    },
  );
  it("passos intermediários não encerram o tour", () => {
    open();
    act(() => gameTour().onEvent({ status: "running" }));
    expect(usePlayer.getState().player.tourDone).toBe(false);
    expect(gameTour().run).toBe(true);
  });
  it("não roda para quem já fez o tutorial, nem fora da fase 1", () => {
    open({ tutorialDone: true });
    expect(gameTour().run).toBe(false);
    cleanup();
    (globalThis as { __joyride?: JoyProps[] }).__joyride = [];
    open({}, "/play/vila-2?vs=medio");
    expect(calls().some((c) => c.run)).toBe(false);
  });
  it("dispensar o tutorial no ‘Pular’ também encerra o tour", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(gameTour().run).toBe(false);
  });
  it("jogador novo vê o tour; quem já tinha progresso salvo não", async () => {
    const {
      tourDone: _t,
      tutorialDone: _d,
      ...old
    } = structuredClone(initialPlayer);
    void _t;
    void _d;
    vi.mocked(repository.load).mockResolvedValueOnce(
      old as typeof initialPlayer,
    );
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.tourDone).toBe(true);
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
