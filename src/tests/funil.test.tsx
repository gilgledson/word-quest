import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { opponentFor } from "../game/opponents";
import { PuzzleEngine } from "../game/crossword-engine";
import { duelMode, reached, withMilestone } from "../game/funnel";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
const tracked = vi.hoisted(() => [] as { name: string; params?: object }[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: object) => tracked.push({ name, params }),
  };
});
beforeEach(() => {
  tracked.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const events = (name: string) => tracked.filter((e) => e.name === name);
/** Abre a fase `n` com as anteriores vencidas. */
function open(n: number, patch: Partial<Player> = {}) {
  const stars = Object.fromEntries(
    levels.slice(0, n - 1).map((l) => [l.id, 1]),
  );
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      tutorialDone: true,
      tourDone: true,
      stars,
      ...patch,
    },
    ready: true,
  });
  return render(
    <MemoryRouter initialEntries={[`/play/${levels[n - 1].id}`]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("funil da primeira experiência", () => {
  it("marco anotado uma vez só, e o nome do modo da partida", () => {
    const p = withMilestone({ milestones: [] as string[] }, "first_move");
    expect(reached(p, "first_move")).toBe(true);
    expect(withMilestone(p, "first_move")).toBe(p);
    expect(reached(p, "first_word")).toBe(false);
    expect(duelMode({ online: true })).toBe("online");
    expect(duelMode({ daily: true })).toBe("diario");
    expect(duelMode({ casual: true })).toBe("casual");
    expect(duelMode({})).toBe("aventura");
  });

  it("abrir um duelo mede duel_start com modo, tamanho e se é o primeiro", () => {
    open(2);
    const [start] = events("duel_start");
    expect(start.params).toMatchObject({
      mode: "aventura",
      size: `${levels[1].cols}x${levels[1].rows}`,
      bot_level: "facil",
      first: true,
    });
  });

  it("depois do primeiro duelo terminado, duel_start vem com first: false", () => {
    open(2, { milestones: ["first_duel_end"] });
    expect(events("duel_start")[0].params).toMatchObject({ first: false });
  });

  it("fase bloqueada não conta como início nem abandono do primeiro duelo", () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), tutorialDone: true },
      ready: true,
    });
    const { unmount } = render(
      <MemoryRouter initialEntries={[`/play/${levels[3].id}`]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    unmount();
    expect(events("duel_start")).toEqual([]);
    expect(events("first_duel_quit")).toEqual([]);
  });

  it("sair do primeiro duelo sem terminar mede first_duel_quit uma vez só", () => {
    const first = open(2);
    first.unmount();
    expect(events("first_duel_quit")).toHaveLength(1);
    expect(events("first_duel_quit")[0].params).toMatchObject({
      mode: "aventura",
      round: 0,
      letters: 0,
    });
    expect(usePlayer.getState().player.milestones).toContain("first_duel_quit");
    // Abrir e sair de novo não repete o marco.
    const player = usePlayer.getState().player;
    const again = open(2, { milestones: player.milestones });
    again.unmount();
    expect(events("first_duel_quit")).toHaveLength(1);
  });

  it("quem já terminou um duelo não gera first_duel_quit ao sair", () => {
    const { unmount } = open(2, { milestones: ["first_duel_end"] });
    unmount();
    expect(events("first_duel_quit")).toEqual([]);
  });

  it("a primeira jogada confirmada mede first_move uma vez só; passar a vez não conta", () => {
    vi.useFakeTimers();
    open(2);
    const confirm = () =>
      screen.getByRole("button", {
        name: /^(Confirmar \d+ letras?|Passar a vez)$/,
      });
    fireEvent.click(
      screen.queryAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    act(() => {
      fireEvent.click(confirm());
    });
    expect(events("first_move")).toHaveLength(1);
    expect(events("first_move")[0].params).toMatchObject({
      mode: "aventura",
      tutorial: false,
    });
    const move = events("first_move")[0].params as {
      correct: number;
      wrong: number;
    };
    expect(move.correct + move.wrong).toBe(1);
    expect(usePlayer.getState().player.milestones).toContain("first_move");
    // Depois da jogada, o rival joga: first_rival_turn, também uma vez só.
    for (let i = 0; i < 20 && !events("first_rival_turn").length; i++)
      act(() => void vi.advanceTimersByTime(1000));
    expect(events("first_rival_turn")).toHaveLength(1);
    expect(events("first_rival_turn")[0].params).toMatchObject({
      mode: "aventura",
    });
  });

  it("o primeiro duelo terminado mede first_duel_end com o resultado, uma vez só", () => {
    vi.useFakeTimers();
    // Fase 5 (grade inteira): falta uma casa, a letra dela está no banco do jogador.
    const puzzle = levels[4];
    const level =
      opponentFor({
        puzzleId: puzzle.id,
        number: 5,
        mode: "campaign",
        date: "2026-11-21",
      })?.level ?? "medio";
    const key = `vs:${puzzle.id}:${level}`;
    const engine = new PuzzleEngine(puzzle);
    let s = engine.start(key, level);
    const cells = Object.entries(engine.rack.solution);
    const [lastKey, lastLetter] = cells.at(-1)!;
    s = structuredClone(s);
    for (const [k, l] of cells.slice(0, -1)) {
      s.letters[k] = l;
      s.locked.push(k);
      s.owners[k] = "ai";
    }
    s.scores = { p: 0, ai: 30 };
    const piece = Object.keys(s.tiles).find(
      (t) =>
        s.tiles[t].letter === lastLetter &&
        !s.tiles[t].cell &&
        !s.tiles[t].joker,
    )!;
    s.rack = [...s.rack.filter((t) => t !== piece).slice(0, 4), piece];
    s.supply = s.supply.filter((t) => t !== piece);
    s.botRack = s.botRack.filter((t) => t !== piece);
    s.versus = { ...s.versus, turn: "p", rngCount: 3 };
    open(5, { sessions: { [key]: s } });
    const tile = s.rack.find((t) => s.tiles[t].letter === lastLetter)!;
    act(() => {
      fireEvent.click(
        document.querySelector(`[data-cell="${lastKey}"]`) as HTMLElement,
      );
    });
    act(() => {
      fireEvent.click(
        document.querySelector(`[data-tile="${tile}"]`) as HTMLElement,
      );
    });
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /^Confirmar \d+ letras?$/ }),
      );
    });
    act(() => void vi.advanceTimersByTime(2000));
    expect(events("duel_end")).toHaveLength(1);
    expect(events("first_duel_end")).toHaveLength(1);
    expect(events("first_duel_end")[0].params).toMatchObject({
      result: "loss",
      mode: "aventura",
      score_rival: 30,
    });
    // Sair depois de terminar não conta como abandono.
    cleanup();
    expect(events("first_duel_quit")).toEqual([]);
  });
});
