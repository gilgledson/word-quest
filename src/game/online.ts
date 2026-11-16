import { casualPuzzles, casualThemes, levels } from "../data/catalog";
import { PuzzleEngine, type Puzzle, type Session } from "./crossword-engine";
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
  /** Quem saiu, quando a partida foi abandonada. */
  left?: string;
}

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
export const inviteText = (code: string) =>
  `Te desafio no WordQuest! Abra o jogo, toque em "Jogar com um amigo" e digite o código ${code}.`;
