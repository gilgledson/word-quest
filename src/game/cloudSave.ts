import {
  initialPlayer,
  type PlayAccount,
  type Player,
} from "../services/repository";
import { mergeRewarded } from "./rewarded";

/**
 * Progresso guardado na conta do jogador (Jogos salvos do Google Play Games). Vai só o que é
 * progresso: partidas em andamento, histórico e ajustes do aparelho (som, vibração, contraste)
 * ficam de fora.
 */
export interface CloudSave {
  v: 1;
  name: string;
  avatar: string;
  coins: number;
  stars: Record<string, number>;
  daily: string[];
  duels: Player["duels"];
  wordsFound: Record<string, string[]>;
  achievements: string[];
  cleanWins: number;
  chestsOpened: number;
  tutorialDone: boolean;
  tourDone: boolean;
  tipsSeen: string[];
  jokerTourDone: boolean;
  /** Vídeos premiados do dia (trocar de aparelho não devolve vídeos ao limite). */
  rewarded?: { date: string; count: number };
}

export function toCloud(p: Player): CloudSave {
  return {
    v: 1,
    name: p.name,
    avatar: p.avatar,
    coins: p.coins,
    stars: p.stars,
    daily: p.daily,
    duels: p.duels,
    wordsFound: p.wordsFound,
    achievements: p.achievements ?? [],
    cleanWins: p.cleanWins ?? 0,
    chestsOpened: p.chestsOpened,
    tutorialDone: p.tutorialDone,
    tourDone: p.tourDone,
    tipsSeen: p.tipsSeen,
    jokerTourDone: p.jokerTourDone,
    ...(p.rewarded
      ? { rewarded: { date: p.rewarded.date, count: p.rewarded.count } }
      : {}),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const count = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

/** Lê o texto salvo na nuvem. Qualquer coisa fora do formato é descartada, campo a campo. */
export function parseCloud(text: string | null | undefined) {
  if (!text) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(raw) || raw.v !== 1) return undefined;
  const stars: Record<string, number> = {};
  if (isRecord(raw.stars))
    for (const [id, n] of Object.entries(raw.stars))
      if (count(n) > 0) stars[id] = Math.min(3, count(n));
  const duels: Player["duels"] = {};
  if (isRecord(raw.duels))
    for (const [id, r] of Object.entries(raw.duels))
      if (r === "win" || r === "draw" || r === "loss") duels[id] = r;
  const wordsFound: Record<string, string[]> = {};
  if (isRecord(raw.wordsFound))
    for (const [id, list] of Object.entries(raw.wordsFound))
      wordsFound[id] = strings(list);
  const save: CloudSave = {
    v: 1,
    name: typeof raw.name === "string" ? raw.name.slice(0, 30) : "",
    avatar: typeof raw.avatar === "string" ? raw.avatar : "",
    coins: count(raw.coins),
    stars,
    daily: strings(raw.daily),
    duels,
    wordsFound,
    achievements: strings(raw.achievements),
    cleanWins: count(raw.cleanWins),
    chestsOpened: count(raw.chestsOpened),
    tutorialDone: raw.tutorialDone === true,
    tourDone: raw.tourDone === true,
    tipsSeen: strings(raw.tipsSeen),
    jokerTourDone: raw.jokerTourDone === true,
  };
  if (
    isRecord(raw.rewarded) &&
    typeof raw.rewarded.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw.rewarded.date)
  )
    save.rewarded = {
      date: raw.rewarded.date,
      count: count(raw.rewarded.count),
    };
  return save;
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
const RANK = { loss: 0, draw: 1, win: 2 } as const;

/** Tamanho máximo do nome do jogador. */
const NAME_MAX = 30;
/** O jogador ainda não escolheu um nome: usa o de fábrica ou o que veio do Play Games. */
export const followsAccount = (p: Player) =>
  !p.name.trim() ||
  p.name === initialPlayer.name ||
  p.name === p.playGames?.name.slice(0, NAME_MAX);
/**
 * Registra a conta do Play Games que entrou: guarda nome e foto no aparelho e, se o jogador ainda
 * não escolheu um nome, passa a usar o da conta (e acompanha se ele mudar lá). Um nome digitado
 * pelo jogador nunca é trocado.
 */
export function adoptAccount(p: Player, account: PlayAccount): Player {
  const name = followsAccount(p) ? account.name.slice(0, NAME_MAX) : p.name;
  const old = p.playGames;
  if (
    name === p.name &&
    old?.name === account.name &&
    old?.photo === account.photo
  )
    return p;
  return { ...p, name, playGames: account };
}

/**
 * Junta o progresso do aparelho com o da nuvem sem perder nada de nenhum dos dois: fica o maior de
 * cada número (estrelas por fase, moedas, baús) e a união de cada lista (palavras, dias do diário,
 * conquistas resgatadas). Nome e avatar só vêm da nuvem se os do aparelho ainda forem os de fábrica.
 */
export function mergeCloud(local: Player, cloud: CloudSave): Player {
  const stars = { ...local.stars };
  for (const [id, n] of Object.entries(cloud.stars))
    stars[id] = Math.max(stars[id] ?? 0, n);
  const duels = { ...local.duels };
  for (const [id, r] of Object.entries(cloud.duels))
    if (!duels[id] || RANK[r] > RANK[duels[id]]) duels[id] = r;
  const wordsFound = { ...local.wordsFound };
  for (const [id, list] of Object.entries(cloud.wordsFound))
    wordsFound[id] = union(wordsFound[id] ?? [], list);
  // O nome escolhido pelo jogador na conta vale mais que o de fábrica e que o do Play Games.
  const chosen = cloud.name && cloud.name !== initialPlayer.name;
  const untouched =
    followsAccount(local) && local.avatar === initialPlayer.avatar;
  return {
    ...local,
    name: followsAccount(local) && chosen ? cloud.name : local.name,
    avatar: untouched && cloud.avatar ? cloud.avatar : local.avatar,
    coins: Math.max(local.coins, cloud.coins),
    stars,
    daily: union(local.daily, cloud.daily).sort(),
    duels,
    wordsFound,
    achievements: union(local.achievements ?? [], cloud.achievements),
    cleanWins: Math.max(local.cleanWins ?? 0, cloud.cleanWins),
    chestsOpened: Math.max(local.chestsOpened, cloud.chestsOpened),
    tutorialDone: local.tutorialDone || cloud.tutorialDone,
    tourDone: local.tourDone || cloud.tourDone,
    tipsSeen: union(local.tipsSeen, cloud.tipsSeen),
    jokerTourDone: local.jokerTourDone || cloud.jokerTourDone,
    rewarded: mergeRewarded(local.rewarded, cloud.rewarded),
  };
}

/** Texto que vai para a nuvem (e que serve para saber se algo mudou desde o último envio). */
export const cloudText = (p: Player) => JSON.stringify(toCloud(p));
