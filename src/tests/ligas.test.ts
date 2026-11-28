import { describe, expect, it } from "vitest";
import {
  WEEK_XP_CAP,
  closeGroup,
  demoteCount,
  previousWeek,
  promoteCount,
  rankGroup,
  tierDown,
  tierUp,
  weekEnd,
  weekOf,
  type LeagueRow,
} from "../../functions/league.js";
import {
  LEAGUE_XP,
  addLeagueXp,
  leagueNow,
  markLeagueSent,
  pendingLeagueXp,
  xpFor,
} from "../game/league";
import { initialPlayer, type Player } from "../services/repository";

const player = (over: Partial<Player> = {}): Player => ({
  ...initialPlayer,
  name: "Gil",
  ...over,
});
/** Grupo de `n` jogadores com XP decrescente (u1 tem mais). */
const group = (n: number, xp = (i: number) => (n - i) * 100): LeagueRow[] =>
  Array.from({ length: n }, (_, i) => ({ uid: `u${i + 1}`, xp: xp(i), at: i }));
const moves = (tier: string, rows: LeagueRow[]) =>
  closeGroup(tier, rows).map((r) => r.moved);
const count = (list: string[], v: string) => list.filter((m) => m === v).length;

describe("semana da liga (UTC)", () => {
  it("começa na segunda 00:00 UTC", () => {
    // Sexta, 27/11/2026, 20h UTC → semana de segunda 23/11.
    expect(weekOf(Date.UTC(2026, 10, 27, 20))).toBe("2026-11-23");
    expect(weekOf(Date.UTC(2026, 10, 23, 0, 0, 0))).toBe("2026-11-23");
    // Domingo 23:59 UTC ainda é a mesma semana; segunda 00:00 já é a próxima.
    expect(weekOf(Date.UTC(2026, 10, 29, 23, 59))).toBe("2026-11-23");
    expect(weekOf(Date.UTC(2026, 10, 30, 0, 0))).toBe("2026-11-30");
  });
  it("vira o ano e o mês sem erro", () => {
    expect(weekOf(Date.UTC(2027, 0, 1, 12))).toBe("2026-12-28");
    expect(previousWeek("2026-11-30")).toBe("2026-11-23");
    expect(previousWeek("2027-01-04")).toBe("2026-12-28");
    expect(weekEnd("2026-11-23")).toBe(Date.UTC(2026, 10, 30));
  });
});

describe("ordem das ligas", () => {
  it("sobe e desce sem passar das pontas", () => {
    expect(tierUp("bronze")).toBe("prata");
    expect(tierUp("diamante")).toBe("diamante");
    expect(tierDown("prata")).toBe("bronze");
    expect(tierDown("bronze")).toBe("bronze");
    expect(tierUp("desconhecida")).toBe("prata");
  });
  it("quantos sobem e descem conforme o tamanho do grupo", () => {
    expect([1, 2, 3, 4, 12, 30].map(promoteCount)).toEqual([1, 1, 1, 2, 4, 10]);
    expect([1, 4, 5, 12, 30].map(demoteCount)).toEqual([0, 0, 0, 1, 4]);
    expect(demoteCount(40)).toBe(5);
  });
});

describe("fechamento de um grupo", () => {
  it("grupo cheio de 30 na Prata: 10 sobem, 4 descem, o resto fica", () => {
    const m = moves("prata", group(30));
    expect(m.slice(0, 10)).toEqual(Array(10).fill("up"));
    expect(m.slice(26)).toEqual(Array(4).fill("down"));
    expect(count(m, "stay")).toBe(16);
  });
  it("no Bronze ninguém desce", () => {
    expect(count(moves("bronze", group(30)), "down")).toBe(0);
  });
  it("no Diamante ninguém sobe, mas o pódio ganha moedas", () => {
    const res = closeGroup("diamante", group(30));
    expect(
      count(
        res.map((r) => r.moved),
        "up",
      ),
    ).toBe(0);
    expect(res.slice(0, 4).map((r) => r.coins)).toEqual([100, 60, 40, 0]);
    expect(res[0].tier).toBe("diamante");
  });
  it("grupo de 1: o único jogador sobe e leva o 1º lugar", () => {
    const [r] = closeGroup("bronze", group(1));
    expect(r).toMatchObject({
      rank: 1,
      size: 1,
      moved: "up",
      tier: "prata",
      coins: 120,
    });
  });
  it("grupo de 4 na Prata: 2 sobem e ninguém desce", () => {
    expect(moves("prata", group(4))).toEqual(["up", "up", "stay", "stay"]);
  });
  it("grupo de 12 no Ouro: 4 sobem e o último desce", () => {
    const res = closeGroup("ouro", group(12));
    expect(
      count(
        res.map((r) => r.moved),
        "up",
      ),
    ).toBe(4);
    expect(res.at(-1)).toMatchObject({ moved: "down", tier: "prata" });
    expect(res[0]).toMatchObject({ tier: "cristal", coins: 120 });
    expect(res[3].coins).toBe(20);
  });
  it("quem ficou com XP 0 desce (da Prata para cima) e não ganha prêmio", () => {
    const rows = group(6, (i) => (i < 2 ? 0 : 500 - i));
    const res = closeGroup("cristal", rows);
    const zeros = res.filter((r) => r.xp === 0);
    expect(zeros.map((r) => r.moved)).toEqual(["down", "down"]);
    expect(zeros.every((r) => r.coins === 0)).toBe(true);
    // Num grupo pequeno do Bronze, o XP 0 só fica.
    expect(count(moves("bronze", rows), "down")).toBe(0);
  });
  it("XP acima do teto semanal vale 0", () => {
    const rows = [
      { uid: "trapaça", xp: WEEK_XP_CAP + 1, at: 0 },
      ...group(5).slice(1),
    ];
    const res = closeGroup("prata", rows);
    expect(res.at(-1)).toMatchObject({ uid: "trapaça", xp: 0, moved: "down" });
    expect(res[0].uid).toBe("u2");
  });
  it("no empate, quem chegou antes àquele XP fica na frente", () => {
    const ranked = rankGroup([
      { uid: "b", xp: 300, at: 20 },
      { uid: "a", xp: 300, at: 10 },
      { uid: "c", xp: 300 },
      { uid: "d", xp: 900, at: 99 },
    ]);
    expect(ranked.map((r) => r.uid)).toEqual(["d", "a", "b", "c"]);
  });
});

describe("XP da liga no aparelho", () => {
  const now = Date.UTC(2026, 10, 27, 12);
  it("conta palavras novas, a vitória, as estrelas e o diário", () => {
    const before = player();
    expect(xpFor(before, player({ wordsFound: { f1: ["a", "b", "c"] } }))).toBe(
      3 * LEAGUE_XP.word,
    );
    expect(
      xpFor(before, player({ duels: { k: "win" }, stars: { f1: 3 } })),
    ).toBe(LEAGUE_XP.win + 3 * LEAGUE_XP.star);
    expect(
      xpFor(before, player({ duels: { k: "win" } }), { online: true }),
    ).toBe(LEAGUE_XP.onlineWin);
    expect(xpFor(before, player({ daily: ["2026-11-27"] }))).toBe(
      LEAGUE_XP.daily,
    );
  });
  it("derrota, empate e fase já concluída não rendem XP", () => {
    expect(xpFor(player(), player({ duels: { k: "loss" } }))).toBe(0);
    const done = player({ duels: { k: "win" }, stars: { f1: 2 } });
    expect(xpFor(done, done)).toBe(0);
    // Melhorar de 2 para 3 estrelas conta só a estrela nova.
    expect(xpFor(done, { ...done, stars: { f1: 3 } })).toBe(LEAGUE_XP.star);
  });
  it("soma na semana atual e recomeça na semana seguinte", () => {
    let p = addLeagueXp(player(), 50, now);
    p = addLeagueXp(p, 30, now);
    expect(p.league).toEqual({ week: "2026-11-23", xp: 80, sent: 0 });
    const next = now + 7 * 24 * 60 * 60 * 1000;
    expect(leagueNow(p, next)).toEqual({ week: "2026-11-30", xp: 0, sent: 0 });
    expect(addLeagueXp(p, 10, next).league).toEqual({
      week: "2026-11-30",
      xp: 10,
      sent: 0,
    });
    expect(addLeagueXp(p, 0, now)).toBe(p);
  });
  it("guarda o que já foi enviado e o que falta enviar", () => {
    let p = addLeagueXp(player(), 120, now);
    expect(pendingLeagueXp(p, now)).toBe(120);
    p = markLeagueSent(p, "2026-11-23", 100);
    expect(pendingLeagueXp(p, now)).toBe(20);
    // Resposta atrasada (menor) ou de outra semana não volta o envio.
    expect(markLeagueSent(p, "2026-11-23", 50)).toBe(p);
    expect(markLeagueSent(p, "2026-11-16", 120)).toBe(p);
  });
});
