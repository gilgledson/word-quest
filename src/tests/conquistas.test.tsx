import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../components/Layout";
import { levels } from "../data/catalog";
import { Profile } from "../features/pages";
import { settleSession } from "../features/puzzle/settleSession";
import { ResultPopup } from "../features/ResultPopup";
import {
  ACHIEVEMENTS,
  achievementStatus,
  bestDailyStreak,
  claimAchievement,
  claimableCount,
} from "../game/achievements";
import {
  positions,
  PuzzleEngine,
  type Session,
} from "../game/crossword-engine";
import { OPPONENTS } from "../game/opponents";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (original) => ({
  ...(await original<typeof import("../services/repository")>()),
  repository: { load: async () => undefined, save: async () => {} },
}));
afterEach(() => cleanup());

const player = (patch: Partial<Player> = {}): Player => ({
  ...structuredClone(initialPlayer),
  ...patch,
});
const status = (p: Player, id: string) =>
  achievementStatus(p).find((a) => a.id === id)!;
/** Estrelas nas `n` primeiras fases (a 5ª de cada mundo é o chefe). */
const won = (n: number) =>
  Object.fromEntries(levels.slice(0, n).map((l) => [l.id, 2]));

describe("regras das conquistas", () => {
  it("sem progresso, nada está pronto", () => {
    expect(claimableCount(player())).toBe(0);
    expect(achievementStatus(player()).every((a) => a.progress === 0)).toBe(
      true,
    );
  });
  it("a maior sequência do diário ignora repetições e buracos", () => {
    expect(bestDailyStreak([])).toBe(0);
    expect(
      bestDailyStreak([
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-11-01",
        "2026-11-05",
        "2026-11-06",
      ]),
    ).toBe(3);
  });
  it("vencer o primeiro mundo completa passo, chefe e mundo", () => {
    const p = player({ stars: won(5) });
    expect(status(p, "primeiro-passo").done).toBe(true);
    expect(status(p, "chefe").done).toBe(true);
    expect(status(p, "mundo-completo").done).toBe(true);
    expect(status(p, "chefes-todos")).toMatchObject({
      done: false,
      progress: 1,
      goal: 5,
    });
    // Quatro fases não bastam para o chefe nem para o mundo.
    const q = player({ stars: won(4) });
    expect(status(q, "chefe").done).toBe(false);
    expect(status(q, "mundo-completo").progress).toBe(4);
  });
  it("o progresso não passa da meta", () => {
    const p = player({ daily: ["2026-11-01", "2026-11-02"] });
    expect(status(p, "diario-1").progress).toBe(1);
    expect(status(p, "diario-7").progress).toBe(2);
  });
  it("resgatar paga as moedas uma vez só, e só com a meta atingida", () => {
    const p = player({ stars: won(1) });
    const prize = ACHIEVEMENTS.find((a) => a.id === "primeiro-passo")!.coins;
    const paid = claimAchievement(p, "primeiro-passo");
    expect(paid.coins).toBe(p.coins + prize);
    expect(paid.achievements).toEqual(["primeiro-passo"]);
    expect(claimAchievement(paid, "primeiro-passo")).toBe(paid);
    expect(claimAchievement(p, "chefe")).toBe(p);
    expect(claimAchievement(p, "nao-existe")).toBe(p);
  });
});

describe("vitória sem errar letra", () => {
  const puzzle = levels[0];
  const engine = new PuzzleEngine(puzzle);
  const ctx = {
    engine,
    puzzleId: puzzle.id,
    sessionKey: "k",
    daily: false,
    casual: false,
    date: "2026-11-12",
  };
  /** Grade toda travada pelo jogador, com o placar dado. */
  const ended = (patch: Partial<Session>): Session => {
    const s = engine.start("seed", "facil");
    const cells = [
      ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
    ];
    return {
      ...s,
      locked: cells,
      owners: Object.fromEntries(cells.map((k) => [k, "p" as const])),
      scores: { p: 20, ai: 5 },
      ...patch,
    };
  };
  it("a partida nova começa sem erros e o engine conta cada letra errada", () => {
    const word = puzzle.words[0];
    const cell = positions(word)[0];
    let s = engine.start("t", "medio");
    expect(s.misses).toBe(0);
    const wrong = s.rack.find((t) => s.tiles[t].letter !== cell.letter)!;
    s = engine.insert(s, word.id, wrong, cell.key);
    expect(engine.confirm(s, "p").session.misses).toBe(1);
  });
  it("só a vitória limpa conta", () => {
    const base = player();
    expect(settleSession(base, ended({}), 0, ctx).cleanWins).toBe(1);
    expect(settleSession(base, ended({ misses: 2 }), 0, ctx).cleanWins).toBe(0);
    expect(
      settleSession(base, ended({ scores: { p: 3, ai: 9 } }), 0, ctx).cleanWins,
    ).toBe(0);
    // Partida antiga, sem o contador: não vale como limpa.
    expect(
      settleSession(base, ended({ misses: undefined }), 0, ctx).cleanWins,
    ).toBe(0);
    expect(
      status(settleSession(base, ended({}), 0, ctx), "mao-certeira").done,
    ).toBe(true);
  });
});

describe("telas", () => {
  const open = (ui: React.ReactElement, patch: Partial<Player> = {}) => {
    usePlayer.setState({ player: player(patch), ready: true, error: "" });
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>,
    );
  };
  it("o Perfil lista todas, com progresso e prêmio", () => {
    open(<Profile />, { daily: ["2026-11-01", "2026-11-02"] });
    const list = screen.getByLabelText("Conquistas");
    // Recolhida, mostra só as próximas metas; "Ver todas" abre o resto.
    expect(list.querySelectorAll("li")).toHaveLength(4);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver todas as 14 conquistas" }),
    );
    expect(list.querySelectorAll("li")).toHaveLength(ACHIEVEMENTS.length);
    expect(
      screen.getByRole("progressbar", { name: "Progresso de Semana perfeita" }),
    ).toHaveAttribute("aria-valuenow", "2");
    expect(list).toHaveTextContent("2/7");
  });
  it("resgatar no Perfil soma as moedas e marca como resgatada", () => {
    open(<Profile />, { stars: won(1) });
    const first = screen.getByLabelText("Conquistas").querySelector("li")!;
    // As prontas vêm primeiro.
    expect(first).toHaveTextContent("O primeiro passo");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Resgatar 20 moedas de O primeiro passo",
      }),
    );
    const now = usePlayer.getState().player;
    expect(now.coins).toBe(initialPlayer.coins + 20);
    expect(now.achievements).toEqual(["primeiro-passo"]);
    expect(screen.queryByRole("button", { name: /^Resgatar/ })).toBeNull();
    // As resgatadas vão para o fim da lista, que abre no "Ver todas".
    fireEvent.click(screen.getByRole("button", { name: /^Ver todas/ }));
    expect(screen.getByLabelText("Conquistas")).toHaveTextContent(
      "Resgatada ✓",
    );
  });
  it("'Resgatar tudo' paga todas as prontas de uma vez e some", () => {
    open(<Profile />, { stars: won(5) });
    // Passo, chefe e mundo completo: 20 + 50 + 60.
    fireEvent.click(
      screen.getByRole("button", {
        name: "Resgatar tudo: 130 moedas de 3 conquistas",
      }),
    );
    const now = usePlayer.getState().player;
    expect(now.coins).toBe(initialPlayer.coins + 130);
    expect(now.achievements).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /^Resgatar/ })).toBeNull();
    // Com uma só pronta, o botão geral não aparece.
    cleanup();
    open(<Profile />, { stars: won(1) });
    expect(screen.queryByRole("button", { name: /^Resgatar tudo/ })).toBeNull();
  });
  it("a navegação avisa quantas conquistas esperam o resgate", () => {
    open(<Layout />, { stars: won(5) });
    expect(
      screen.getByLabelText("3 conquistas para resgatar"),
    ).toHaveTextContent("3");
    cleanup();
    open(<Layout />);
    expect(screen.queryByLabelText(/para resgatar/)).toBeNull();
  });
  it("o resultado anuncia a conquista que a partida completou", () => {
    render(
      <MemoryRouter>
        <ResultPopup
          result="win"
          rival={OPPONENTS[0]}
          mood="sad"
          moodKey={0}
          scores={{ p: 9, ai: 4 }}
          coins={50}
          stars={1}
          achievements={["O primeiro passo"]}
          enabled={false}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Conquista: O primeiro passo. Resgate no Perfil.",
    );
  });
});
