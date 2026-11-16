import type { BotLevel, BotStyle } from "./crossword-engine";
import castRaw from "../data/opponents.json";

/**
 * Elenco de oponentes. Cada fase da campanha tem um oponente fixo (`OPPONENT_BY_LEVEL`), com um
 * chefe na última fase de cada mundo; o modo casual e o Desafio do Dia sorteiam. O nível define
 * a força geral (`OPPONENT_LEVELS`) e o estilo, o jeito de jogar (`OPPONENT_STYLES`). Cada
 * personagem tem um rosto por humor em public/art/opponents/<id>-<humor>.webp (folhas geradas no
 * Leonardo.ai e cortadas em seis expressões).
 */
export interface OpponentProfile {
  id: string;
  name: string;
  species: string;
  level: BotLevel;
  style: BotStyle;
  tagline: string;
  /** Fala curta quando o oponente vence ou perde. */
  win: string;
  lose: string;
  /** Chefe de um mundo (última fase). */
  boss?: boolean;
  /**
   * Base dos rostos: `<art>-<humor>.webp`. Sem ela, public/art/opponents/<id>; num personagem
   * baixado, o endereço no servidor de conteúdo.
   */
  art?: string;
}
export interface Cast {
  opponents: OpponentProfile[];
  /** Número da fase → id do oponente. */
  byLevel: Record<string, string>;
}

/** Expressões de cada personagem: neutro, pensando, feliz, com raiva, triste e surpreso. */
export const MOODS = [
  "neutral",
  "thinking",
  "happy",
  "angry",
  "sad",
  "surprised",
] as const;
export type Mood = (typeof MOODS)[number];

/** O elenco que vem dentro do app (src/data/opponents.json). */
export const bundledCast: Cast = castRaw as Cast;
/** Elenco em uso: o do app ou o baixado (src/content), trocado no lugar antes da primeira tela. */
export const OPPONENTS: OpponentProfile[] = [];
/** Oponente de cada fase da campanha (número da fase → id); a 5ª de cada mundo é o chefe. */
export const OPPONENT_BY_LEVEL: Record<number, string> = {};
export function setCast(cast: Cast) {
  OPPONENTS.splice(0, OPPONENTS.length, ...cast.opponents);
  for (const k of Object.keys(OPPONENT_BY_LEVEL))
    delete OPPONENT_BY_LEVEL[Number(k)];
  for (const [k, id] of Object.entries(cast.byLevel))
    OPPONENT_BY_LEVEL[Number(k)] = id;
}
setCast(bundledCast);

/** Nome curto para o placar ("Mestre Cuco" → "Cuco"). */
export const shortName = (o: Pick<OpponentProfile, "name">) =>
  o.name.split(" ").at(-1) ?? o.name;

export const opponentById = (id: string | undefined) =>
  OPPONENTS.find((o) => o.id === id);

/** Primeiro oponente (o cuidadoso) de um nível; usado em partidas antigas, sem personagem. */
export const defaultOpponent = (level: BotLevel) =>
  OPPONENTS.find((o) => o.level === level && o.style === "cuidadoso")!;

/** Quem joga a partida: o personagem gravado na sessão, ou o padrão do nível (partidas antigas). */
export const opponentOfSession = (
  versus: { level: BotLevel; opponent?: string } | undefined,
) =>
  opponentById(versus?.opponent) ?? defaultOpponent(versus?.level ?? "medio");

const hashOf = (text: string) =>
  [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Oponente de uma partida: a fase fixa o seu; o Desafio do Dia usa um por data; no casual vale o
 * que foi sorteado ao iniciar (`pick`) ou, sem isso, um estável pelo id da grade. `override`
 * (parâmetro `vs` da URL, que o app não gera) existe para testes e depuração.
 */
export function opponentFor(opts: {
  puzzleId: string;
  number: number;
  mode: "campaign" | "daily" | "casual";
  date?: string;
  pick?: string | null;
  override?: string | null;
}): OpponentProfile {
  const forced =
    opponentById(opts.override ?? undefined) ??
    (opts.override
      ? OPPONENTS.find((o) => o.level === opts.override)
      : undefined);
  if (forced) return forced;
  if (opts.mode === "campaign")
    return opponentById(OPPONENT_BY_LEVEL[opts.number]) ?? OPPONENTS[2];
  if (opts.mode === "daily")
    return OPPONENTS[hashOf(opts.date ?? "") % OPPONENTS.length];
  return (
    opponentById(opts.pick ?? undefined) ??
    OPPONENTS[hashOf(opts.puzzleId) % OPPONENTS.length]
  );
}

export const randomOpponent = (): OpponentProfile =>
  OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];

export const opponentFace = (id: string, mood: Mood = "neutral") =>
  `${opponentById(id)?.art ?? `/art/opponents/${id}`}-${mood}.webp`;
