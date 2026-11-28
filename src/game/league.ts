import { weekOf, type Tier } from "../../functions/league.js";
import type { Player } from "../services/repository";

/**
 * XP da liga semanal feito no aparelho (plano: docs/planos/ligas-semanais.md). A semana e as
 * regras de fechamento são as mesmas das Functions (functions/league.js).
 */
export { TIERS, weekOf, weekEnd, type Tier } from "../../functions/league.js";

/** XP de cada ação (valores iniciais, fáceis de ajustar). */
export const LEAGUE_XP = {
  /** Cada palavra nova descoberta (a fase refeita não conta de novo). */
  word: 10,
  /** Duelo vencido contra o rival do jogo (Aventura ou Casual), na primeira conclusão. */
  win: 50,
  /** Cada estrela nova ganha na Aventura. */
  star: 20,
  /** Desafio diário vencido (uma vez por dia). */
  daily: 50,
  /** Duelo vencido contra uma pessoa. */
  onlineWin: 120,
} as const;

export interface LeagueProgress {
  /** Semana (segunda-feira UTC) a que o XP pertence. */
  week: string;
  /** XP feito nesta semana. */
  xp: number;
  /** Quanto desse XP o servidor já recebeu. */
  sent: number;
  /** Liga e grupo desta semana, depois de entrar. */
  seat?: { tier: Tier; group: string };
}

const total = (r: Record<string, number>) =>
  Object.values(r).reduce((a, b) => a + b, 0);
const wordCount = (p: Player) =>
  Object.values(p.wordsFound ?? {}).reduce((a, w) => a + w.length, 0);

/**
 * XP que a jogada rendeu, comparando o jogador antes e depois dela. Usa só o que já é pago uma vez
 * (palavras novas, a primeira conclusão do duelo, estrelas novas, o diário do dia), então refazer
 * uma fase não rende XP de novo.
 */
export function xpFor(
  before: Player,
  after: Player,
  { online = false }: { online?: boolean } = {},
): number {
  let xp = Math.max(0, wordCount(after) - wordCount(before)) * LEAGUE_XP.word;
  for (const [key, result] of Object.entries(after.duels))
    if (result === "win" && !(key in before.duels))
      xp += online ? LEAGUE_XP.onlineWin : LEAGUE_XP.win;
  xp += Math.max(0, total(after.stars) - total(before.stars)) * LEAGUE_XP.star;
  xp +=
    after.daily.filter((d) => !before.daily.includes(d)).length *
    LEAGUE_XP.daily;
  return xp;
}

/** Progresso da semana de `now` (o de uma semana passada recomeça do zero). */
export function leagueNow(p: Player, now = Date.now()): LeagueProgress {
  const week = weekOf(now);
  return p.league?.week === week ? p.league : { week, xp: 0, sent: 0 };
}

/** Soma `xp` ao progresso da semana de `now`. */
export function addLeagueXp(p: Player, xp: number, now = Date.now()): Player {
  if (xp <= 0) return p;
  const cur = leagueNow(p, now);
  return { ...p, league: { ...cur, xp: cur.xp + xp } };
}

/** XP da semana ainda não enviado ao servidor. */
export const pendingLeagueXp = (p: Player, now = Date.now()) => {
  const cur = leagueNow(p, now);
  return cur.xp - cur.sent;
};

/** Marca como enviado o XP até `xp` (o total que o servidor gravou nesta semana). */
export function markLeagueSent(p: Player, week: string, xp: number): Player {
  if (p.league?.week !== week || xp <= p.league.sent) return p;
  return { ...p, league: { ...p.league, sent: Math.min(xp, p.league.xp) } };
}
