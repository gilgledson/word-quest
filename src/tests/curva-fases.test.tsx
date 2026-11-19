import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { opponentFor } from "../game/opponents";
import { economy, easyDuel, PuzzleEngine } from "../game/crossword-engine";
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
afterEach(() => cleanup());

/** Abre a fase `n` com as anteriores vencidas (senão ela aparece bloqueada). */
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
const rivalOf = (n: number) =>
  opponentFor({
    puzzleId: levels[n - 1].id,
    number: n,
    mode: "campaign",
    date: "2026-11-19",
  });
const events = (name: string) => tracked.filter((e) => e.name === name);

describe("curva do começo da Aventura: 3 fáceis e 1 média", () => {
  it("fases 1 a 3 contra rival fácil; a 4 é a primeira média; a 5 é o chefe", () => {
    expect([1, 2, 3].map((n) => rivalOf(n)?.level)).toEqual([
      "facil",
      "facil",
      "facil",
    ]);
    expect(rivalOf(4)?.level).toBe("medio");
    expect(rivalOf(4)?.id).toBe("sabi");
    expect(rivalOf(5)?.id).toBe("cuco");
  });

  it("fases 2 a 4 são duelos curtos, cada vez um pouco mais longos; a 5 é a grade inteira", () => {
    expect(economy.campaignRounds).toEqual({ 2: 8, 3: 10, 4: 12 });
    for (const n of [2, 3, 4]) {
      open(n);
      expect(
        screen.getByLabelText(`Rodada 1 de ${economy.campaignRounds[n]}`),
      ).toBeInTheDocument();
      cleanup();
    }
    open(5);
    expect(screen.queryByLabelText(/^Rodada/)).toBeNull();
    expect(screen.getByLabelText(/palavras fechadas/)).toBeInTheDocument();
  });

  it("a ajuda na mão vale nas fáceis e não na primeira média", () => {
    const s = new PuzzleEngine(levels[0]).start("t", "facil");
    expect(easyDuel({ ...s, versus: { ...s.versus, rounds: 8 } })).toBe(true);
    expect(
      easyDuel({
        ...s,
        versus: { ...s.versus, rounds: 12, level: "medio" },
      }),
    ).toBe(false);
    expect(easyDuel(s)).toBe(false);
  });
});

describe("medição fase a fase", () => {
  it("ao abrir uma fase nova: level_start com o número da fase e a tentativa", () => {
    open(2);
    const [start] = events("level_start");
    expect(start.params).toMatchObject({
      level_number: 2,
      level_id: levels[1].id,
      bot_level: "facil",
      rounds: 8,
      attempt: 1,
    });
    expect(usePlayer.getState().player.levelAttempts?.[levels[1].id]).toBe(1);
  });

  it("tentar de novo conta a segunda tentativa", () => {
    open(3, { levelAttempts: { [levels[2].id]: 1 } });
    expect(events("level_start")[0].params).toMatchObject({
      level_number: 3,
      attempt: 2,
    });
  });

  it("fase bloqueada não conta como início nem abandono", () => {
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
    expect(screen.getByText("Um passo de cada vez")).toBeInTheDocument();
    unmount();
    expect(events("level_start")).toEqual([]);
    expect(events("level_quit")).toEqual([]);
  });

  it("sair no meio da fase registra level_quit", () => {
    const { unmount } = open(4);
    unmount();
    expect(events("level_quit")[0].params).toMatchObject({
      level_number: 4,
      attempt: 1,
      round: 0,
    });
  });
});
