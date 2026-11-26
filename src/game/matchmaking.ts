/**
 * "Procurar oponente": o duelo ao vivo sem precisar de um amigo com o código. Quem procura entra
 * na sala pública mais antiga do mesmo idioma ou, sem nenhuma, abre a sua e espera um tempo. Se
 * ninguém chega, a partida segue contra o rival do jogo (o mesmo motor do duelo comum) com nome e
 * avatar de jogador, na mesma tela do duelo ao vivo: para quem joga, é só um oponente encontrado.
 * Essa partida não passa pelo servidor; fica guardada no aparelho (`Player.botRooms`).
 */
import type { Lang } from "../i18n";
import { PLAYER_AVATARS } from "./avatars";
import type { Puzzle } from "./crossword-engine";
import type { BoardSize, OnlineSeat, RoomRules } from "./online";

/** Quanto tempo a procura espera outro jogador antes de cair no rival do jogo. */
export const SEARCH_MS = 20_000;
/** De quanto em quanto tempo quem espera confere se apareceu uma sala mais antiga que a sua. */
export const SEARCH_POLL_MS = 3_000;
/** Sala pública mais velha que isto já foi esquecida por quem abriu (app fechado no meio). */
export const LOBBY_FRESH_MS = 60_000;
/** Partida rápida: o menor tabuleiro e tempo por jogada (um estranho não pode travar a partida). */
export const MATCH_BOARD: BoardSize = "6x6";
export const MATCH_RULES: RoomRules = { turnSeconds: 60, bet: 0 };

/** Uma sala pública esperando oponente (`lobby/<idioma>/<código>` no servidor). */
export interface LobbyEntry {
  code: string;
  uid: string;
  createdAt: number;
}

/** A sala em que vale entrar: de outra pessoa, recente, a que espera há mais tempo. */
export const pickEntry = (
  entries: LobbyEntry[],
  me: string,
  now = Date.now(),
  /** Só salas abertas antes desta hora (quem já tem sala só troca por uma mais antiga). */
  before = Infinity,
) =>
  entries
    .filter(
      (e) =>
        e.uid !== me &&
        now - e.createdAt < LOBBY_FRESH_MS &&
        e.createdAt < before,
    )
    .sort((a, b) => a.createdAt - b.createdAt)[0];
/** Salas públicas abandonadas (app fechado no meio da procura): qualquer um pode tirá-las. */
export const staleEntries = (entries: LobbyEntry[], now = Date.now()) =>
  entries.filter((e) => now - e.createdAt >= LOBBY_FRESH_MS);

/** Partida contra o rival do jogo que saiu da procura (guardada no aparelho, pelo código). */
export interface BotRoom {
  /** A grade vai junto: a partida continua mesmo se o catálogo mudar depois. */
  grid: Puzzle;
  lang: Lang;
  rival: OnlineSeat;
  rules: RoomRules;
  createdAt: number;
}

const pick = <T>(list: readonly T[], rand: () => number) =>
  list[Math.floor(rand() * list.length) % list.length];
// Nomes como os que aparecem nas salas de verdade: apelidos do Play Games (palavras em inglês
// com número) e primeiros nomes de quem trocou o nome no jogo.
const TAG_A = [
  "Brave",
  "Lucky",
  "Quiet",
  "Spirited",
  "Clever",
  "Sunny",
  "Swift",
  "Gentle",
  "Cosmic",
  "Mellow",
  "Witty",
  "Bold",
] as const;
const TAG_B = [
  "Falcon",
  "Pebble",
  "Comet",
  "Otter",
  "Maple",
  "Riddle",
  "Lantern",
  "Harbor",
  "Puzzle",
  "Willow",
  "Ember",
  "Meadow",
] as const;
type Gender = "f" | "m";
/** Primeiros nomes por idioma e gênero: o nome combina com o rosto do avatar. */
const FIRST_NAMES: Record<Lang, Record<Gender, readonly string[]>> = {
  pt: {
    f: ["Bia", "Ana", "Júlia", "Duda", "Gabi", "Carol", "Mari", "Lari"],
    m: ["Lucas", "Rafa", "Pedro", "Léo", "Thiago", "Vini", "Bruno", "Caio"],
  },
  en: {
    f: ["Priya", "Neha", "Anjali", "Joy", "Mae", "Aisha", "Kim", "Grace"],
    m: ["Arjun", "Rahul", "Rohan", "Paolo", "Ravi", "Sam", "Jay", "Mark"],
  },
};
/**
 * Gênero de cada avatar de pessoa (docs/referencias/avatares). Os bichos (gatinho, panda) servem
 * para qualquer nome; a coelhinha, só para nome feminino.
 */
export const AVATAR_GENDER: Record<string, Gender> = {
  jogador: "m",
  garoto: "m",
  skatista: "m",
  detetive: "m",
  cavaleiro: "m",
  latino: "m",
  menina: "f",
  cientista: "f",
  pirata: "f",
  astronauta: "f",
  latina: "f",
  coelhinha: "f",
};
/** Nome e avatar de um jogador qualquer, diferente do avatar e do nome de quem procura. */
export function fakeSeat(
  lang: Lang,
  mine: { name: string; avatar: string },
  rand: () => number = Math.random,
): OnlineSeat {
  const faces = PLAYER_AVATARS.filter((a) => a.id !== mine.avatar);
  const avatar = pick(faces, rand).id;
  const gender: Gender = AVATAR_GENDER[avatar] ?? (rand() < 0.5 ? "f" : "m");
  let name = "";
  do {
    name =
      rand() < 0.5
        ? `${pick(TAG_A, rand)}${pick(TAG_B, rand)}${Math.floor(rand() * 900) + 10}`
        : pick(FIRST_NAMES[lang][gender], rand);
  } while (name.toLowerCase() === mine.name.trim().toLowerCase());
  return { uid: "", name, avatar };
}

/**
 * Quanto o oponente "pensa" antes de colocar as letras: alguns segundos, mais nas jogadas maiores,
 * como uma pessoa: de 6 a 24 s, bem dentro do minuto da jogada (o rival do jogo responde em
 * menos de um segundo).
 */
export const humanThinkMs = (letters: number, rand: () => number) =>
  6_000 + Math.floor(rand() * 12_000) + 1_500 * Math.min(letters, 4);

/** Partidas da procura guardadas no aparelho: só as mais recentes (as antigas já acabaram). */
export const BOT_ROOMS_MAX = 5;
/** Códigos de partidas da procura que podem ser esquecidos (além das `BOT_ROOMS_MAX` mais novas). */
export const oldBotRooms = (rooms: Record<string, BotRoom> | undefined) =>
  Object.entries(rooms ?? {})
    .sort(([, a], [, b]) => b.createdAt - a.createdAt)
    .slice(BOT_ROOMS_MAX)
    .map(([code]) => code);
