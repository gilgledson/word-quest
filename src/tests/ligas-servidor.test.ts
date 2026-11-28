import { afterEach, describe, expect, it, vi } from "vitest";
import { closeWeekUpdates, nextSeat } from "../../functions/league.js";
import { addLeagueXp } from "../game/league";
import {
  SEND_GAP_MS,
  SEND_MAX_XP,
  claimLeagueResult,
  memoryLeague,
  setLeagueBackend,
  syncLeague,
} from "../services/league";
import { initialPlayer, type Player } from "../services/repository";

vi.mock("../services/telemetry", () => ({ track: vi.fn() }));

const MONDAY = Date.UTC(2026, 10, 23, 10);
const WEEK = "2026-11-23";

/** Um aparelho: o jogador guardado, o relógio e o servidor em memória. */
function device(server: ReturnType<typeof memoryLeague>, uid: string) {
  let p: Player = { ...initialPlayer, name: uid, avatar: "panda" };
  const backend = server.as(uid);
  const deps = {
    get: () => p,
    update: (fn: (p: Player) => Player) => void (p = fn(p)),
    now: () => clock.now,
  };
  return {
    backend,
    get player() {
      return p;
    },
    earn(xp: number) {
      p = addLeagueXp(p, xp, clock.now);
    },
    async sync() {
      setLeagueBackend(backend);
      await syncLeague(deps);
    },
  };
}
const clock = { now: MONDAY };
afterEach(() => {
  setLeagueBackend(undefined);
  clock.now = MONDAY;
});

describe("assentos da liga", () => {
  it("enche o grupo até 30 e abre o seguinte", () => {
    expect(nextSeat(undefined)).toEqual({ group: 1, count: 1 });
    expect(nextSeat({ group: 1, count: 29 })).toEqual({ group: 1, count: 30 });
    expect(nextSeat({ group: 1, count: 30 })).toEqual({ group: 2, count: 1 });
  });
  it("31 jogadores ficam em 2 grupos; entrar de novo devolve o mesmo lugar", async () => {
    const server = memoryLeague(() => clock.now);
    const seats = [];
    for (let i = 0; i < 31; i++) seats.push(await server.as(`u${i}`).join());
    expect(seats.filter((s) => s?.group === "1")).toHaveLength(30);
    expect(seats[30]).toEqual({ week: WEEK, tier: "bronze", group: "2" });
    expect(await server.as("u0").join()).toEqual(seats[0]);
  });
});

describe("envio do XP", () => {
  it("entra na liga no primeiro envio e grava o XP no grupo", async () => {
    const server = memoryLeague(() => clock.now);
    const gil = device(server, "gil");
    gil.earn(120);
    await gil.sync();
    expect(gil.player.league).toMatchObject({
      week: WEEK,
      xp: 120,
      sent: 120,
      seat: { tier: "bronze", group: "1" },
    });
    const seat = (await gil.backend.join())!;
    expect(await gil.backend.group(seat)).toEqual([
      expect.objectContaining({
        uid: "gil",
        name: "gil",
        avatar: "panda",
        xp: 120,
      }),
    ]);
  });
  it("XP guardado sem internet vai em partes de 600, com intervalo", async () => {
    const server = memoryLeague(() => clock.now);
    const gil = device(server, "gil");
    gil.earn(1000);
    await gil.sync();
    expect(gil.player.league?.sent).toBe(SEND_MAX_XP);
    // Antes do intervalo, o banco recusaria: nada sai.
    clock.now += 5_000;
    await gil.sync();
    expect(gil.player.league?.sent).toBe(SEND_MAX_XP);
    clock.now += SEND_GAP_MS;
    await gil.sync();
    expect(gil.player.league?.sent).toBe(1000);
  });
  it("sem nada pendente, não entra na liga", async () => {
    const server = memoryLeague(() => clock.now);
    const gil = device(server, "gil");
    await gil.sync();
    expect(gil.player.league).toBeUndefined();
    expect(await gil.backend.state()).toBeNull();
  });
  it("o servidor recusa XP demais de uma vez e linha de outro grupo", async () => {
    const server = memoryLeague(() => clock.now);
    const bia = server.as("bia");
    const seat = (await bia.join())!;
    await expect(
      bia.send(seat, { name: "Bia", avatar: "panda", xp: 601 }),
    ).rejects.toThrow();
    await expect(
      bia.send(
        { ...seat, group: "9" },
        { name: "Bia", avatar: "panda", xp: 10 },
      ),
    ).rejects.toThrow();
    await bia.send(seat, { name: "Bia", avatar: "panda", xp: 10 });
    // Semana fechada não aceita mais XP.
    server.close(WEEK);
    clock.now += SEND_GAP_MS;
    await expect(
      bia.send(seat, { name: "Bia", avatar: "panda", xp: 20 }),
    ).rejects.toThrow();
  });
});

describe("fechamento da semana", () => {
  it("grava a nova liga e o resultado de cada jogador", () => {
    const updates = closeWeekUpdates(WEEK, {
      prata: {
        "1": {
          a: { xp: 900, at: 1 },
          b: { xp: 300, at: 2 },
          c: { xp: 100, at: 3 },
        },
      },
    });
    expect(updates["leagueState/a"]).toEqual({
      tier: "ouro",
      result: {
        week: WEEK,
        group: "1",
        from: "prata",
        tier: "ouro",
        rank: 1,
        size: 3,
        xp: 900,
        moved: "up",
        coins: 120,
      },
    });
    expect(updates["leagueState/c"]).toMatchObject({
      tier: "prata",
      result: { rank: 3, moved: "stay", coins: 40 },
    });
  });
  it("na semana seguinte quem subiu entra na liga nova e recebe o prêmio uma vez", async () => {
    const server = memoryLeague(() => clock.now);
    const gil = device(server, "gil");
    const bia = device(server, "bia");
    gil.earn(300);
    bia.earn(100);
    await gil.sync();
    await bia.sync();
    server.close(WEEK);
    clock.now += 7 * 24 * 60 * 60 * 1000;

    const state = await gil.backend.state();
    const first = claimLeagueResult(gil.player, state);
    expect(first.result).toMatchObject({ rank: 1, moved: "up", coins: 120 });
    expect(first.player.coins).toBe(gil.player.coins + 120);
    expect(first.player).toMatchObject({
      leagueTier: "prata",
      leagueSeen: WEEK,
    });
    // Ver de novo não paga de novo.
    const again = claimLeagueResult(first.player, state);
    expect(again.result).toBeUndefined();
    expect(again.player).toBe(first.player);

    gil.earn(50);
    await gil.sync();
    expect(gil.player.league).toMatchObject({
      week: "2026-11-30",
      xp: 50,
      seat: { tier: "prata", group: "1" },
    });
  });
});
