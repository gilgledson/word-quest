import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { weekOf, type Tier } from "../../functions/league.js";
import { today } from "../data/catalog";
import {
  LeagueHomeCard,
  LeaguePage,
  LeagueResultFlow,
  refreshLeague,
  useLeague,
} from "../features/League";
import {
  setLeagueBackend,
  type LeagueBackend,
  type LeagueEntry,
} from "../services/league";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
const tracked = vi.hoisted(() => [] as string[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return { ...mod, track: (name: string) => tracked.push(name) };
});
afterEach(() => {
  cleanup();
  setLeagueBackend(undefined);
  useLeague.setState({
    status: "idle",
    entries: [],
    me: undefined,
    result: undefined,
  });
  tracked.length = 0;
});

const week = weekOf(Date.now());
/** Servidor de mentira: o jogador "me" já está no grupo, com os outros dados. */
function fakeServer(
  tier: Tier,
  others: number,
  extra: Partial<LeagueBackend> = {},
): LeagueBackend {
  const entries: LeagueEntry[] = Array.from({ length: others }, (_, i) => ({
    uid: `u${i}`,
    name: `Rival ${i + 1}`,
    avatar: "panda",
    xp: 1000 - i * 50,
    at: i,
  }));
  return {
    uid: async () => "me",
    join: async () => ({ week, tier, group: "1" }),
    send: async () => {},
    group: async () => [
      ...entries,
      { uid: "me", name: "Gil", avatar: "jogador", xp: 0, at: 99 },
    ],
    state: async () => ({ tier }),
    ...extra,
  };
}
const setPlayer = (patch: Partial<Player>) =>
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      name: "Gil",
      tutorialDone: true,
      ...patch,
    },
    ready: true,
  });
const mine = (tier: Tier, xp: number): Partial<Player> => ({
  league: { week, xp, sent: xp, seat: { tier, group: "1" } },
});

describe("tela da liga", () => {
  it("mostra o grupo em ordem, a linha do jogador e a zona de promoção do Bronze", async () => {
    setPlayer(mine("bronze", 780));
    setLeagueBackend(fakeServer("bronze", 11));
    render(
      <MemoryRouter>
        <LeaguePage />
      </MemoryRouter>,
    );
    await screen.findByText("Você");
    const rows = screen
      .getAllByRole("listitem")
      .filter((li) => li.classList.contains("league-row"));
    expect(rows).toHaveLength(12);
    // 1000, 950, 900, 850, 800 na frente; o jogador (780) é o 6º.
    expect(rows[5]).toHaveClass("mine");
    expect(rows[5]).toHaveTextContent("780 XP");
    expect(screen.getByText("Zona de promoção")).toBeInTheDocument();
    expect(screen.queryByText("Zona de rebaixamento")).toBeNull();
    expect(
      screen.getByText("Os 4 primeiros sobem para a Liga Prata"),
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: true })).toHaveTextContent(
      "Bronze",
    );
    expect(tracked).toContain("league_view");
  });
  it("da Prata para cima aparece a zona de rebaixamento", async () => {
    setPlayer(mine("prata", 100));
    setLeagueBackend(fakeServer("prata", 11));
    render(
      <MemoryRouter>
        <LeaguePage />
      </MemoryRouter>,
    );
    await screen.findByText("Você");
    expect(screen.getByText("Zona de rebaixamento")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Liga Prata" }),
    ).toBeInTheDocument();
  });
  it("sem XP na semana, convida a jogar", async () => {
    setPlayer({});
    setLeagueBackend(fakeServer("bronze", 0, { group: async () => [] }));
    render(
      <MemoryRouter>
        <LeaguePage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(
        "Jogue uma partida para entrar na liga desta semana.",
      ),
    ).toBeInTheDocument();
  });
  it("sem conexão, avisa que o XP fica guardado", async () => {
    setPlayer(mine("bronze", 50));
    setLeagueBackend(
      fakeServer("bronze", 3, {
        uid: async () => {
          throw new Error("offline");
        },
      }),
    );
    render(
      <MemoryRouter>
        <LeaguePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Seu XP fica guardado/)).toBeInTheDocument();
    // Sem o grupo, nada de lista (o jogador sozinho seria o 1º): só o XP do aparelho.
    expect(screen.getByText("Seu XP nesta semana: 50 XP")).toBeInTheDocument();
    expect(screen.queryByText("Você")).toBeNull();
  });
});

describe("card da tela inicial", () => {
  it("mostra a posição depois de ler o grupo", async () => {
    setPlayer(mine("ouro", 780));
    setLeagueBackend(fakeServer("ouro", 11));
    render(
      <MemoryRouter>
        <LeagueHomeCard />
      </MemoryRouter>,
    );
    expect(screen.getByText("Liga Ouro")).toBeInTheDocument();
    // Antes de ler o grupo, só o XP (sozinho, o jogador seria sempre o 1º).
    expect(screen.getByText("780 XP")).toBeInTheDocument();
    await refreshLeague();
    expect(await screen.findByText("Você está em 6º")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Ver liga" }));
    expect(tracked).toContain("home_league_card");
  });
  it("antes do primeiro XP, convida a jogar", () => {
    setPlayer({ leagueTier: "cristal" });
    render(
      <MemoryRouter>
        <LeagueHomeCard />
      </MemoryRouter>,
    );
    expect(screen.getByText("Liga Cristal")).toBeInTheDocument();
    expect(screen.getByText("Jogue para entrar na liga")).toBeInTheDocument();
  });
});

describe("resultado da semana", () => {
  const result = {
    week: "2026-11-16",
    group: "1",
    from: "bronze" as const,
    tier: "prata" as const,
    rank: 2,
    size: 12,
    xp: 900,
    moved: "up" as const,
    coins: 80,
  };
  it("paga uma vez e mostra a folha depois da recompensa diária", async () => {
    setPlayer({
      coins: 100,
      loginReward: { last: today(), day: 1 },
    });
    setLeagueBackend(
      fakeServer("prata", 0, {
        group: async () => [],
        state: async () => ({ tier: "prata", result }),
      }),
    );
    await refreshLeague();
    expect(usePlayer.getState().player).toMatchObject({
      coins: 180,
      leagueSeen: "2026-11-16",
      leagueTier: "prata",
    });
    render(
      <MemoryRouter>
        <LeagueResultFlow />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole("dialog", { name: "Fim da semana" });
    expect(dialog).toHaveTextContent("Você subiu para a Liga Prata");
    expect(dialog).toHaveTextContent("Você terminou em 2º lugar");
    expect(dialog).toHaveTextContent("+80 moedas");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Ler de novo não paga de novo.
    await refreshLeague();
    expect(usePlayer.getState().player.coins).toBe(180);
    expect(useLeague.getState().result).toBeUndefined();
  });
  it("espera a recompensa diária do dia ser pega", async () => {
    setPlayer({});
    useLeague.setState({ result });
    render(
      <MemoryRouter>
        <LeagueResultFlow />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
