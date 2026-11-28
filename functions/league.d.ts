/** Tipos das regras das ligas (functions/league.js), para o app e os testes em TypeScript. */
export type Tier = "bronze" | "prata" | "ouro" | "cristal" | "diamante";
export interface LeagueRow {
  uid: string;
  xp: number;
  /** Quando o XP atual foi gravado (ms); desempata a favor de quem chegou antes. */
  at?: number;
}
export interface LeagueResult {
  uid: string;
  xp: number;
  rank: number;
  size: number;
  from: Tier;
  tier: Tier;
  moved: "up" | "down" | "stay";
  coins: number;
}
export const TIERS: readonly Tier[];
export const GROUP_SIZE: number;
export const WEEK_XP_CAP: number;
export const PODIUM_COINS: readonly number[];
export const PROMOTION_COINS: number;
export const DEMOTE_MIN_GROUP: number;
export function weekOf(now: number): string;
export function weekStart(week: string): number;
export function weekEnd(week: string): number;
export function previousWeek(week: string): string;
export function tierOf(tier: string | undefined): Tier;
export function tierUp(tier: string | undefined): Tier;
export function tierDown(tier: string | undefined): Tier;
export function promoteCount(n: number): number;
export function demoteCount(n: number): number;
export function rankGroup<T extends LeagueRow>(rows: T[]): T[];
export function closeGroup(
  tier: string | undefined,
  rows: LeagueRow[],
): LeagueResult[];
export function nextSeat(
  open: { group?: number; count?: number } | null | undefined,
): { group: number; count: number };
/** Resultado da semana gravado em `leagueState/{uid}/result`. */
export interface WeekResult extends Omit<LeagueResult, "uid"> {
  week: string;
  group: string;
}
export function closeWeekUpdates(
  week: string,
  leagues: unknown,
): Record<string, { tier: Tier; result: WeekResult }>;
