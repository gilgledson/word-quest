import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AVATAR_GENDER,
  LOBBY_FRESH_MS,
  MATCH_RULES,
  SEARCH_MS,
  fakeSeat,
  humanThinkMs,
  oldBotRooms,
  pickEntry,
  staleEntries,
  type BotRoom,
} from "../game/matchmaking";
import {
  boardPuzzles,
  sessionKeyOf,
  startOnline,
  type OnlineRoom,
} from "../game/online";
import { PLAYER_AVATARS } from "../game/avatars";
import { memoryBackend, setOnlineBackend } from "../services/online";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
import { OnlineLobby, OnlineMatch, OnlineSearch } from "../features/OnlinePage";
import { endOnlineMatch } from "../features/onlineCleanup";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

const tracked: { name: string; params?: Record<string, unknown> }[] = [];
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: Record<string, unknown>) =>
      tracked.push({ name, params }),
  };
});
const starts = () =>
  tracked.filter((t) => t.name === "duel_start").map((t) => t.params);

const grid = boardPuzzles("6x6")[0];

describe("procura de oponente: regras", () => {
  const now = 1_000_000;
  const entries = [
    { code: "NOVAAA", uid: "b", createdAt: now - 1_000 },
    { code: "MINHAA", uid: "eu", createdAt: now - 9_000 },
    { code: "VELHAA", uid: "c", createdAt: now - 5_000 },
    { code: "ESQUEC", uid: "d", createdAt: now - LOBBY_FRESH_MS - 1 },
  ];
  it("entra na sala de outra pessoa que espera há mais tempo, nunca numa esquecida", () => {
    expect(pickEntry(entries, "eu", now)?.code).toBe("VELHAA");
    expect(staleEntries(entries, now).map((e) => e.code)).toEqual(["ESQUEC"]);
    expect(pickEntry([], "eu", now)).toBeUndefined();
  });
  it("quem já abriu sala só troca por uma aberta antes da sua", () => {
    expect(pickEntry(entries, "eu", now, now - 9_000)).toBeUndefined();
    expect(pickEntry(entries, "eu", now, now - 2_000)?.code).toBe("VELHAA");
  });
  it("o oponente tem nome e avatar de jogador, diferentes dos de quem procura", () => {
    for (let i = 0; i < 40; i++) {
      const seat = fakeSeat(i % 2 ? "pt" : "en", {
        name: "Bia",
        avatar: "panda",
      });
      expect(seat.name.length).toBeGreaterThanOrEqual(2);
      expect(seat.name).not.toBe("Bia");
      expect(seat.avatar).not.toBe("panda");
      expect(PLAYER_AVATARS.some((a) => a.id === seat.avatar)).toBe(true);
    }
  });
  it("primeiro nome combina com o rosto: nome de mulher só com avatar feminino, e vice-versa", () => {
    const women = new Set([
      "Bia",
      "Ana",
      "Júlia",
      "Duda",
      "Gabi",
      "Carol",
      "Mari",
      "Lari",
      "Priya",
      "Neha",
      "Anjali",
      "Joy",
      "Mae",
      "Aisha",
      "Kim",
      "Grace",
    ]);
    const men = new Set([
      "Lucas",
      "Rafa",
      "Pedro",
      "Léo",
      "Thiago",
      "Vini",
      "Bruno",
      "Caio",
      "Arjun",
      "Rahul",
      "Rohan",
      "Paolo",
      "Ravi",
      "Sam",
      "Jay",
      "Mark",
    ]);
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 400; i++) {
      const seat = fakeSeat(
        i % 2 ? "pt" : "en",
        { name: "Gil", avatar: "jogador" },
        rand,
      );
      const g = AVATAR_GENDER[seat.avatar];
      if (women.has(seat.name)) expect(g).not.toBe("m");
      if (men.has(seat.name)) expect(g).not.toBe("f");
    }
    // Todo avatar de pessoa tem gênero definido.
    for (const a of PLAYER_AVATARS)
      if (!["gatinho", "panda"].includes(a.id))
        expect(AVATAR_GENDER[a.id]).toBeDefined();
  });
  it("pensa alguns segundos por jogada, como uma pessoa", () => {
    expect(humanThinkMs(0, () => 0)).toBeGreaterThanOrEqual(6_000);
    expect(humanThinkMs(4, () => 0.99)).toBeLessThanOrEqual(24_000);
  });
  it("guarda só as partidas mais recentes", () => {
    const room = (createdAt: number): BotRoom => ({
      grid,
      lang: "pt",
      rival: { uid: "", name: "Ana", avatar: "panda" },
      rules: MATCH_RULES,
      createdAt,
    });
    const rooms = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((n) => [`SALA0${n}`, room(n)]),
    );
    expect(oldBotRooms(rooms).sort()).toEqual(["SALA01", "SALA02"]);
  });
});

describe("tela de procurar oponente", () => {
  let mem: ReturnType<typeof memoryBackend>;
  beforeEach(() => {
    tracked.length = 0;
    mem = memoryBackend();
    setOnlineBackend(mem.as("eu"));
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        name: "Gil",
        profileSet: true,
        tutorialDone: true,
        tourDone: true,
        animations: false,
        sound: false,
        vibration: false,
      },
      ready: true,
    });
  });
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const open = (path = "/online/procurar") =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="online" element={<OnlineLobby />} />
          <Route path="online/procurar" element={<OnlineSearch />} />
          <Route path="online/:code" element={<OnlineMatch />} />
        </Routes>
      </MemoryRouter>,
    );
  const waiting = (code: string, uid: string, name: string): OnlineRoom => ({
    code,
    puzzleId: grid.id,
    grid,
    lang: "pt",
    host: { uid, name, avatar: "panda" },
    status: "waiting",
    rev: 0,
    rules: MATCH_RULES,
    source: "busca",
    state: startOnline(grid.id, code, grid),
  });

  it("o lobby oferece procurar oponente, sem código", async () => {
    open("/online");
    fireEvent.click(screen.getByRole("button", { name: /Procurar oponente/ }));
    expect(
      await screen.findByRole("heading", { name: "Procurando oponente…" }),
    ).toBeInTheDocument();
  });

  it("com alguém esperando, entra na sala dele e a partida começa", async () => {
    await mem.as("bia").create(waiting("BIA234", "bia", "Bia"));
    await mem
      .as("bia")
      .list("pt", { code: "BIA234", uid: "bia", createdAt: Date.now() });
    open();
    expect(
      await screen.findByRole("heading", { name: "Oponente encontrado!" }),
    ).toBeInTheDocument();
    expect(mem.rooms.get("BIA234")!.guest?.uid).toBe("eu");
    expect(mem.rooms.get("BIA234")!.status).toBe("playing");
    // Saiu da lista pública: ninguém mais tenta entrar nela.
    expect(await mem.as("x").lobby("pt")).toEqual([]);
    expect(
      await screen.findByRole(
        "heading",
        { name: "Contra Bia" },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    // Pessoa real vinda da busca: modo online, origem busca.
    expect(starts().at(-1)).toMatchObject({
      mode: "online",
      match_source: "busca",
    });
  });

  it("duelo de código de amigo sai na medição com origem código", async () => {
    await mem
      .as("bia")
      .create({ ...waiting("AMG234", "bia", "Bia"), source: undefined });
    await mem
      .as("eu")
      .join("AMG234", { uid: "eu", name: "Gil", avatar: "jogador" });
    open("/online/AMG234");
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(starts().at(-1)).toMatchObject({
      mode: "online",
      match_source: "codigo",
    });
  });

  it("sem ninguém, abre uma sala pública; quem procura depois entra nela", async () => {
    open();
    await waitFor(async () =>
      expect(await mem.as("x").lobby("pt")).toHaveLength(1),
    );
    const [entry] = await mem.as("x").lobby("pt");
    const room = mem.rooms.get(entry.code)!;
    expect(room.host.uid).toBe("eu");
    expect(room.rules).toEqual(MATCH_RULES);
    expect(room.source).toBe("busca");
    expect(room.grid?.cols).toBe(6);
    expect(room.grid?.rows).toBe(6);
    await act(async () => {
      await mem
        .as("bia")
        .join(entry.code, { uid: "bia", name: "Bia", avatar: "panda" });
    });
    expect(
      await screen.findByRole("heading", { name: "Oponente encontrado!" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        "heading",
        { name: "Contra Bia" },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });

  it("cancelar tira a sala da lista e a apaga", async () => {
    open();
    await waitFor(async () =>
      expect(await mem.as("x").lobby("pt")).toHaveLength(1),
    );
    fireEvent.click(screen.getByRole("link", { name: /Cancelar/ }));
    await waitFor(() => expect(mem.rooms.size).toBe(0));
    expect(await mem.as("x").lobby("pt")).toEqual([]);
  });

  it("ninguém chegou em 20 s: o rival do jogo entra sozinho, com cara de jogador, na tela do duelo ao vivo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    open();
    await waitFor(async () =>
      expect(await mem.as("x").lobby("pt")).toHaveLength(1),
    );
    // O relógio da espera conta para cima (não é contagem regressiva).
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    await act(async () => void vi.advanceTimersByTime(5_000));
    await waitFor(() =>
      expect(screen.getByRole("timer")).not.toHaveTextContent("00:00"),
    );
    await act(async () => void vi.advanceTimersByTime(SEARCH_MS + 50));
    // Sem ninguém de verdade, sem perguntar nada: segue contra o rival do jogo.
    expect(screen.queryByRole("button", { name: /fila/i })).toBeNull();
    // A sala pública some do servidor; a partida fica só no aparelho.
    await waitFor(() => expect(mem.rooms.size).toBe(0));
    expect(await mem.as("x").lobby("pt")).toEqual([]);
    expect(
      await screen.findByRole("heading", { name: "Oponente encontrado!" }),
    ).toBeInTheDocument();
    const player = usePlayer.getState().player;
    const [code, room] = Object.entries(player.botRooms ?? {})[0];
    expect(player.sessions[sessionKeyOf(code)]).toBeDefined();
    await act(async () => void vi.advanceTimersByTime(1900));
    const heading = await screen.findByRole("heading", {
      name: `Contra ${room.rival.name}`,
    });
    expect(heading).toBeInTheDocument();
    expect(starts().at(-1)).toMatchObject({
      mode: "online_bot",
      match_source: "busca",
    });
    expect(screen.getByText("DUELO AO VIVO")).toBeInTheDocument();
    // Em andamento, marcada como as outras (o aviso do topo leva de volta a ela).
    expect(usePlayer.getState().player.activeOnline).toBe(code);
    // Nada na tela diz que o oponente é o rival do jogo.
    expect(document.body.textContent).not.toMatch(
      /\b(robô|bot|IA|computador)\b/i,
    );
  });

  it("o oponente da procura joga sozinho, mas leva alguns segundos, como uma pessoa", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const code = "BOT234";
    const session = startOnline(grid.id, code, grid);
    usePlayer.setState((s) => ({
      player: {
        ...s.player,
        botRooms: {
          [code]: {
            grid,
            lang: "pt",
            rival: { uid: "", name: "Ana", avatar: "panda" },
            rules: MATCH_RULES,
            createdAt: Date.now(),
          },
        },
        sessions: {
          [sessionKeyOf(code)]: {
            ...session,
            versus: { ...session.versus, turn: "ai" },
          },
        },
      },
    }));
    open(`/online/${code}`);
    await screen.findByRole("heading", { name: "Contra Ana" });
    const turn = () =>
      usePlayer.getState().player.sessions[sessionKeyOf(code)].versus.turn;
    await act(async () => void vi.advanceTimersByTime(5_000));
    expect(turn()).toBe("ai");
    await act(async () => void vi.advanceTimersByTime(20_000));
    await waitFor(() => expect(turn()).toBe("p"));
  });

  it("encerrar pelo aviso do topo esquece a partida da procura", async () => {
    usePlayer.setState((s) => ({
      player: {
        ...s.player,
        activeOnline: "BOT234",
        botRooms: {
          BOT234: {
            grid,
            lang: "pt",
            rival: { uid: "", name: "Ana", avatar: "panda" },
            rules: MATCH_RULES,
            createdAt: Date.now(),
          },
        },
      },
    }));
    await endOnlineMatch("BOT234");
    const p = usePlayer.getState().player;
    expect(p.activeOnline).toBeUndefined();
    expect(p.botRooms?.BOT234).toBeUndefined();
  });
});
