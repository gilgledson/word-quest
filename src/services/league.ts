/**
 * Servidor da liga semanal. O jogo só conversa com `LeagueBackend`; a versão de verdade
 * (leagueFirebase.ts) usa o mesmo login anônimo do duelo ao vivo e é baixada só quando é usada.
 * As regras do banco e as Functions estão em database.rules.json e functions/index.js.
 */
import {
  closeWeekUpdates,
  nextSeat,
  weekOf,
  type Tier,
  type WeekResult,
} from "../../functions/league.js";
import { leagueNow, markLeagueSent } from "../game/league";
import type { Player } from "./repository";
import { onlineConfigured } from "./firebaseConfig";
import { track } from "./telemetry";

/** Lugar do jogador na liga da semana (`leagueSeat/{semana}/{uid}`). */
export interface LeagueSeat {
  week: string;
  tier: Tier;
  group: string;
}
/** Linha do grupo, como fica em `leagues/{semana}/{liga}/{grupo}/{uid}`. */
export interface LeagueEntry {
  uid: string;
  name: string;
  avatar: string;
  frame?: string;
  xp: number;
  at: number;
}
/** O que vai na linha do jogador (o servidor põe a hora). */
export type LeagueRowInput = Omit<LeagueEntry, "uid" | "at">;
/** Liga atual e resultado da última semana fechada (`leagueState/{uid}`). */
export interface LeagueState {
  tier: Tier;
  result?: WeekResult;
}

export interface LeagueBackend {
  /** Identidade anônima deste aparelho (a mesma do duelo ao vivo). */
  uid(): Promise<string>;
  /**
   * Entra na liga da semana (ou devolve o lugar que já tem). `null` enquanto a semana anterior
   * ainda está sendo fechada: tente de novo mais tarde.
   */
  join(): Promise<LeagueSeat | null>;
  /** Grava a linha do jogador no grupo. Falha se o servidor recusar (XP demais, cedo demais…). */
  send(seat: LeagueSeat, row: LeagueRowInput): Promise<void>;
  /** As linhas do grupo, em qualquer ordem. */
  group(seat: LeagueSeat): Promise<LeagueEntry[]>;
  /** Liga atual e último resultado; `null` para quem nunca jogou. */
  state(): Promise<LeagueState | null>;
}

/** Máximo de XP por envio e intervalo mínimo entre envios (iguais às regras do banco). */
export const SEND_MAX_XP = 600;
export const SEND_GAP_MS = 20_000;

let backend: Promise<LeagueBackend> | undefined;
let faked = false;
/** A liga pode ser usada neste build (há servidor configurado). */
export const leagueAvailable = () => faked || onlineConfigured;
/** O servidor em uso (carregado na primeira chamada). */
export const leagueBackend = () =>
  (backend ??= import("./leagueFirebase").then((m) => m.firebaseLeague()));
/** Só para testes: troca o servidor por um de mentira. */
export const setLeagueBackend = (fake: LeagueBackend | undefined) => {
  faked = !!fake;
  backend = fake ? Promise.resolve(fake) : undefined;
  lastSend = -Infinity;
  running = undefined;
  clearTimeout(retry);
};

/** Nome e avatar como o banco aceita. */
const rowOf = (p: Player, xp: number): LeagueRowInput => ({
  name: (p.name.trim() || "?").slice(0, 30),
  avatar: p.avatar.slice(0, 40),
  ...(p.frame ? { frame: p.frame.slice(0, 40) } : {}),
  xp,
});

let lastSend = -Infinity;
let running: Promise<void> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;

interface SyncDeps {
  get: () => Player;
  update: (fn: (p: Player) => Player) => void;
  now?: () => number;
}
/**
 * Envia o XP da semana que ainda não foi para o servidor (no máximo `SEND_MAX_XP` por vez, com
 * `SEND_GAP_MS` entre envios; o resto vai num novo envio). Entra na liga na primeira vez da
 * semana. Sem internet ou com o servidor recusando, o XP fica guardado e vai depois.
 */
export function syncLeague(deps: SyncDeps): Promise<void> {
  if (!leagueAvailable()) return Promise.resolve();
  running ??= sendOnce(deps)
    .catch(() => {})
    .finally(() => (running = undefined));
  return running;
}

async function sendOnce({ get, update, now = Date.now }: SyncDeps) {
  const cur = leagueNow(get(), now());
  const pending = cur.xp - cur.sent;
  if (pending <= 0) return;
  const wait = lastSend + SEND_GAP_MS - now();
  if (wait > 0) {
    // Cedo demais para o banco aceitar: tenta de novo quando puder.
    clearTimeout(retry);
    retry = setTimeout(() => void syncLeague({ get, update, now }), wait);
    return;
  }
  const server = await leagueBackend();
  let seat = cur.seat && { week: cur.week, ...cur.seat };
  if (!seat) {
    const joined = await server.join();
    if (!joined || joined.week !== cur.week) return;
    seat = joined;
    update((p) =>
      p.league?.week === joined.week
        ? {
            ...p,
            league: {
              ...p.league,
              seat: { tier: joined.tier, group: joined.group },
            },
          }
        : p,
    );
    track("league_joined", { tier: joined.tier });
  }
  const total = cur.sent + Math.min(SEND_MAX_XP, pending);
  await server.send(seat, rowOf(get(), total));
  lastSend = now();
  update((p) => markLeagueSent(p, cur.week, total));
  track("league_xp_sent", { xp: total - cur.sent });
  if (total < cur.xp) {
    clearTimeout(retry);
    retry = setTimeout(
      () => void syncLeague({ get, update, now }),
      SEND_GAP_MS,
    );
  }
}

/**
 * Resultado da semana fechada que o jogador ainda não viu: paga as moedas uma vez só (a semana
 * fica em `leagueSeen`) e guarda a liga atual. Devolve o jogador e o resultado novo, se houver.
 */
export function claimLeagueResult(
  p: Player,
  state: LeagueState | null,
): { player: Player; result?: WeekResult } {
  if (!state) return { player: p };
  const withTier =
    p.leagueTier === state.tier ? p : { ...p, leagueTier: state.tier };
  const result = state.result;
  if (!result || p.leagueSeen === result.week) return { player: withTier };
  return {
    player: {
      ...withTier,
      coins: withTier.coins + Math.max(0, result.coins),
      leagueSeen: result.week,
    },
    result,
  };
}

/**
 * Servidor em memória com as mesmas regras do banco e das Functions (para os testes): `as(uid)` é
 * um aparelho; `close(semana)` faz o fechamento de segunda-feira.
 */
export function memoryLeague(clock: () => number = Date.now) {
  const groups = new Map<string, Map<string, LeagueEntry>>();
  const seats = new Map<string, LeagueSeat>();
  const open = new Map<string, { group: number; count: number }>();
  const states = new Map<string, LeagueState>();
  const closed = new Set<string>();
  const keyOf = (s: LeagueSeat) => `${s.week}/${s.tier}/${s.group}`;
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const as = (uid: string): LeagueBackend => ({
    uid: async () => uid,
    async join() {
      const week = weekOf(clock());
      const had = seats.get(`${week}/${uid}`);
      if (had) return copy(had);
      const tier = states.get(uid)?.tier ?? "bronze";
      const taken = nextSeat(open.get(`${week}/${tier}`));
      open.set(`${week}/${tier}`, taken);
      const seat = { week, tier, group: String(taken.group) };
      seats.set(`${week}/${uid}`, seat);
      return copy(seat);
    },
    async send(seat, row) {
      const mine = seats.get(`${seat.week}/${uid}`);
      const now = clock();
      if (
        !mine ||
        mine.tier !== seat.tier ||
        mine.group !== seat.group ||
        closed.has(seat.week)
      )
        throw new Error("permission_denied");
      const list = groups.get(keyOf(seat)) ?? new Map<string, LeagueEntry>();
      const before = list.get(uid);
      const ok = before
        ? row.xp >= before.xp &&
          row.xp - before.xp <= SEND_MAX_XP &&
          now - before.at >= SEND_GAP_MS
        : row.xp > 0 && row.xp <= SEND_MAX_XP;
      if (!ok) throw new Error("permission_denied");
      list.set(uid, { uid, ...copy(row), at: now });
      groups.set(keyOf(seat), list);
    },
    async group(seat) {
      return [...(groups.get(keyOf(seat))?.values() ?? [])].map(copy);
    },
    async state() {
      return states.has(uid) ? copy(states.get(uid)!) : null;
    },
  });
  /** Fechamento da semana `week`, como a Function `leagueClose`. */
  const close = (week: string) => {
    closed.add(week);
    const leagues: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const [key, list] of groups) {
      const [w, tier, group] = key.split("/");
      if (w !== week) continue;
      (leagues[tier] ??= {})[group] = Object.fromEntries(list);
    }
    for (const [path, state] of Object.entries(closeWeekUpdates(week, leagues)))
      states.set(path.split("/")[1], state);
  };
  return { as, close };
}
