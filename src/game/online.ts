import { casualPuzzles, casualThemes, levels } from "../data/catalog";
import {
  PuzzleEngine,
  economy,
  type Puzzle,
  type Session,
} from "./crossword-engine";
import { JOKER_ID } from "./engine/rack";
import { avatarOf } from "./avatars";
import type { OpponentProfile } from "./opponents";

/**
 * Duelo ao vivo entre dois jogadores. A partida é a mesma do duelo contra o rival do jogo: quem
 * criou a sala ("host") ocupa o lado "p" e o convidado ("guest"), o lado "ai". O estado que vai
 * para o servidor é sempre o do ponto de vista do host; o convidado o enxerga espelhado (`flip`),
 * e assim cada um joga como "p" no próprio aparelho, com as telas e regras de sempre.
 */
export type OnlineRole = "host" | "guest";
/** Regras escolhidas por quem cria a sala. */
export interface RoomRules {
  /** Tempo máximo de cada jogada, em segundos (0 = sem limite). */
  turnSeconds: number;
  /** Moedas que cada um aposta (0 = sem aposta): quem vence leva as duas. */
  bet: number;
}
export const TURN_OPTIONS = [0, 30, 60, 120];
export const BET_OPTIONS = [0, 10, 25, 50, 100];
export const NO_RULES: RoomRules = { turnSeconds: 0, bet: 0 };
/** "30 s", "1 min", "2 min" ou "Sem limite". */
export const turnLabel = (seconds: number) =>
  !seconds
    ? "Sem limite"
    : seconds < 60
      ? `${seconds} s`
      : `${seconds / 60} min`;
/** Moedas que a aposta devolve a quem reservou `bet`: as duas na vitória, a sua no empate. */
export const betPayout = (bet: number, result: "win" | "draw" | "loss") =>
  result === "win" ? 2 * bet : result === "draw" ? bet : 0;
export interface OnlineSeat {
  uid: string;
  name: string;
  avatar: string;
}
export type OnlineStatus = "waiting" | "playing" | "finished" | "abandoned";
export interface OnlineRoom {
  code: string;
  puzzleId: string;
  /**
   * A grade da partida, gravada por quem cria a sala: o convidado joga exatamente ela, mesmo que
   * o catálogo dele (baixado em outra hora, ou de outra versão do app) seja diferente.
   */
  grid?: Puzzle;
  host: OnlineSeat;
  guest?: OnlineSeat;
  status: OnlineStatus;
  /** Número da jogada: sobe a cada vez confirmada (é o `versus.rngCount` do estado). */
  rev: number;
  /** Estado da partida do ponto de vista do host. */
  state: Session;
  /** Tempo por jogada e aposta (salas antigas não têm: sem limite e sem aposta). */
  rules?: RoomRules;
  /** Quem saiu, quando a partida foi abandonada. */
  left?: string;
  /**
   * Quem encerrou: o próprio `left` (saiu ou cancelou), o amigo (depois de esperar demais) ou
   * `ROOM_EXPIRED` (a sala ficou parada mais que `ROOM_EXPIRE_MS`, sem vencedor).
   */
  endedBy?: string;
  /** Quando a sala foi criada (ms). */
  createdAt?: number;
  /** Último movimento na sala: criação, entrada do amigo, jogada ou encerramento (ms). */
  updatedAt?: number;
}

/** Sala parada (ninguém entrou ou ninguém jogou) há mais que isto é encerrada sozinha. */
export const ROOM_EXPIRE_MS = 24 * 60 * 60 * 1000;
/** `endedBy` de uma sala encerrada por ficar parada: ninguém ganha nem perde. */
export const ROOM_EXPIRED = "expirada";
/** A partida ainda não acabou (esperando o amigo ou em jogo). */
export const isLive = (room: Pick<OnlineRoom, "status"> | null | undefined) =>
  room?.status === "waiting" || room?.status === "playing";
/** Sala ainda aberta, mas parada há mais que `ROOM_EXPIRE_MS`. Salas sem horário não expiram. */
export const isExpired = (
  room: Pick<OnlineRoom, "status" | "createdAt" | "updatedAt">,
  now = Date.now(),
) => {
  const last = room.updatedAt ?? room.createdAt;
  return isLive(room) && last !== undefined && now - last > ROOM_EXPIRE_MS;
};
/** A partida acabou porque o outro jogador saiu (e não por ficar parada): `uid` fica com a vitória. */
export const wonByForfeitOf = (
  room: OnlineRoom | null | undefined,
  uid: string | undefined,
) =>
  room?.status === "abandoned" &&
  !!uid &&
  !!room.left &&
  room.left !== uid &&
  room.endedBy !== ROOM_EXPIRED;

/** Grades que podem cair num duelo ao vivo: as da Aventura e as do Casual (do catálogo em uso). */
export const onlinePuzzles = () => [...levels, ...casualPuzzles];
export const onlinePuzzle = (id: string | undefined) =>
  onlinePuzzles().find((p) => p.id === id);
/** A grade de uma sala: a que veio nela, ou (salas antigas) a do catálogo pelo id. */
export const roomPuzzle = (
  room: Pick<OnlineRoom, "puzzleId" | "grid"> | null | undefined,
) => room?.grid ?? onlinePuzzle(room?.puzzleId);
/** "Surpresa" sorteia entre todas as grades; os demais temas, só entre as do tema. */
export const SURPRISE_THEME = "surpresa";
export const onlineThemes = () => [
  { id: SURPRISE_THEME, nome: "Surpresa", puzzles: onlinePuzzles() },
  ...casualThemes,
];
/** Sorteia a grade da partida dentro do tema escolhido por quem cria a sala. */
export const pickOnlinePuzzle = (
  theme: string,
  rand: () => number = Math.random,
) => {
  const themes = onlineThemes();
  const pool = (themes.find((t) => t.id === theme) ?? themes[0]).puzzles;
  return pool[Math.floor(rand() * pool.length)];
};
/** Tema de uma grade (as da Aventura não têm tema). A sala não guarda o tema: ele sai da grade. */
export const themeOfPuzzle = (id: string | undefined) =>
  casualThemes.find((t) => t.puzzles.some((p) => p.id === id));

/** Sem I, O, 0 e 1: o código é ditado e digitado, não pode confundir. */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const newCode = (rand: () => number = Math.random) =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)],
  ).join("");
/** Código como o jogador digitou: maiúsculas, sem espaços nem traços. */
export const cleanCode = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
export const sessionKeyOf = (code: string) => `online:${code}`;

/** Partida nova: a mesma do duelo, sem o curinga (só um dos dois o receberia). */
export function startOnline(
  puzzleId: string,
  seed: string,
  grid?: Puzzle,
): Session {
  const puzzle = grid ?? onlinePuzzle(puzzleId);
  if (!puzzle) throw new Error("Grade inexistente");
  const s = new PuzzleEngine(puzzle).start(seed, "medio");
  const tiles = { ...s.tiles };
  delete tiles[JOKER_ID];
  return { ...s, tiles, supply: s.supply.filter((id) => id !== JOKER_ID) };
}

const other = (who: "p" | "ai") => (who === "p" ? "ai" : "p");
/**
 * Espelha a partida: troca as mãos, os donos das casas, os placares e a vez. Aplicar duas vezes
 * devolve o original. Os erros (`misses`) são de cada jogador e não viajam.
 */
export function flip(s: Session): Session {
  const { misses: _misses, swapped: _swapped, ...rest } = s;
  return {
    ...rest,
    rack: [...s.botRack],
    botRack: [...s.rack],
    owners: Object.fromEntries(
      Object.entries(s.owners).map(([k, who]) => [k, other(who)]),
    ),
    scores: { p: s.scores.ai, ai: s.scores.p },
    versus: { ...s.versus, turn: other(s.versus.turn) },
  };
}
/** O estado do servidor como este jogador o vê (ele é sempre "p"). */
export const toView = (state: Session, role: OnlineRole) =>
  role === "host" ? state : flip(state);
/** A partida deste jogador no formato do servidor. */
export const toShared = (view: Session, role: OnlineRole): Session => {
  const { misses: _misses, swapped: _swapped, ...clean } = view;
  return role === "host" ? clean : flip(clean);
};

export const roleOf = (
  room: OnlineRoom,
  uid: string,
): OnlineRole | undefined =>
  room.host.uid === uid
    ? "host"
    : room.guest?.uid === uid
      ? "guest"
      : undefined;
export const seatOf = (room: OnlineRoom, role: OnlineRole) =>
  role === "host" ? room.host : room.guest;
export const rivalSeat = (room: OnlineRoom, role: OnlineRole) =>
  role === "host" ? room.guest : room.host;

/** O amigo no formato que a tela de partida usa para o rival (rosto, nome e falas do resultado). */
export function rivalProfile(seat: OnlineSeat | undefined): OpponentProfile {
  return {
    id: avatarOf(seat?.avatar).id,
    name: seat?.name?.trim() || "Amigo",
    species: "jogador",
    level: "medio",
    style: "cuidadoso",
    tagline: "Boa partida!",
    win: "Essa foi minha!",
    lose: "Boa! Você mereceu.",
  };
}

/** Texto do convite que vai pelo WhatsApp e afins. */
/** Link do convite: abre a sala no jogo ou, sem o jogo, a página que leva à Play Store. */
export const inviteLink = (code: string) =>
  `https://wordquest.com.br/c/${code}`;
export const inviteText = (code: string) =>
  `Te desafio no WordQuest! Toque para entrar no duelo: ${inviteLink(code)}\n` +
  `Ou abra o jogo, toque em "Jogar com um amigo" e digite o código ${code}.`;
/** Moedas de convite que este amigo rende ao anfitrião: só amigo novo, até o limite. */
export const inviteReward = (
  invited: string[] | undefined,
  friend: string | undefined,
) =>
  friend &&
  !(invited ?? []).includes(friend) &&
  (invited ?? []).length < economy.inviteMax
    ? economy.invite
    : 0;
