import type { BotLevel, BotStyle } from "./crossword-engine";

/**
 * Elenco de oponentes. Cada fase da campanha tem um oponente fixo (`OPPONENT_BY_LEVEL`), com um
 * chefe na última fase de cada mundo; o modo casual e o Desafio do Dia sorteiam. O nível define
 * a força geral (`OPPONENT_LEVELS`) e o estilo, o jeito de jogar (`OPPONENT_STYLES`). Cada
 * personagem tem um rosto por humor em public/art/opponents/<id>-<humor>.png (folhas geradas no
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

export const OPPONENTS: OpponentProfile[] = [
  {
    id: "bolota",
    name: "Bolota",
    species: "esquilo",
    level: "facil",
    style: "cuidadoso",
    tagline: "Devagar e sempre.",
    win: "Eu juntei mais palavras do que você!",
    lose: "Boa! Guardei as palavras pro inverno...",
  },
  {
    id: "fagulha",
    name: "Fagulha",
    species: "dragãozinho",
    level: "facil",
    style: "agressivo",
    tagline: "Vou com tudo!",
    win: "Queimei as palavras todas!",
    lose: "Ai, me apaguei...",
  },
  {
    id: "sabi",
    name: "Sabi",
    species: "coruja",
    level: "medio",
    style: "cuidadoso",
    tagline: "Cada letra no seu lugar.",
    win: "A sabedoria venceu hoje.",
    lose: "Impressionante. Aprendi algo novo.",
  },
  {
    id: "raposo",
    name: "Raposo",
    species: "raposa",
    level: "medio",
    style: "agressivo",
    tagline: "Quem arrisca, petisca.",
    win: "Fui mais esperto, como sempre!",
    lose: "Hmpf... na próxima eu pego você.",
  },
  {
    id: "oraculo",
    name: "Oráculo",
    species: "lince",
    level: "dificil",
    style: "cuidadoso",
    tagline: "Eu já vi esta jogada.",
    win: "Estava escrito nas estrelas.",
    lose: "Isso... eu não previ.",
  },
  {
    id: "draco",
    name: "Draco",
    species: "dragão",
    level: "dificil",
    style: "agressivo",
    tagline: "Nenhuma palavra me escapa.",
    win: "Cinzas e vitória!",
    lose: "Respeito. Poucos me vencem.",
  },
  {
    id: "cuco",
    name: "Mestre Cuco",
    species: "cuco",
    level: "medio",
    style: "cuidadoso",
    tagline: "Tudo tem a sua hora.",
    win: "Cuco! Já deu a sua hora.",
    lose: "Meu relógio parou...",
    boss: true,
  },
  {
    id: "musgo",
    name: "Musgo",
    species: "árvore falante",
    level: "medio",
    style: "agressivo",
    tagline: "Minhas raízes vão fundo.",
    win: "A floresta é minha!",
    lose: "Até as árvores caem...",
    boss: true,
  },
  {
    id: "zefa",
    name: "Esfinge Zefa",
    species: "esfinge",
    level: "dificil",
    style: "cuidadoso",
    tagline: "Decifre-me ou devore-se.",
    win: "O enigma era você.",
    lose: "Você decifrou... raro.",
    boss: true,
  },
  {
    id: "lumen",
    name: "Rainha Lúmen",
    species: "leoa",
    level: "dificil",
    style: "agressivo",
    tagline: "Curve-se às palavras.",
    win: "Longa vida à rainha!",
    lose: "A coroa é sua por hoje.",
    boss: true,
  },
  {
    id: "polvo",
    name: "Capitão Polvo",
    species: "polvo",
    level: "dificil",
    style: "agressivo",
    tagline: "Oito braços, oito palavras.",
    win: "Ah-har! Tesouro meu!",
    lose: "Navegar é preciso... perder também.",
    boss: true,
  },
];

/** Oponente de cada fase da campanha (número da fase → id); a 5ª de cada mundo é o chefe. */
export const OPPONENT_BY_LEVEL: Record<number, string> = {
  1: "bolota",
  2: "bolota",
  3: "fagulha",
  4: "fagulha",
  5: "cuco",
  6: "fagulha",
  7: "sabi",
  8: "fagulha",
  9: "raposo",
  10: "musgo",
  11: "sabi",
  12: "raposo",
  13: "sabi",
  14: "raposo",
  15: "zefa",
  16: "raposo",
  17: "oraculo",
  18: "draco",
  19: "oraculo",
  20: "lumen",
  21: "draco",
  22: "oraculo",
  23: "draco",
  24: "oraculo",
  25: "polvo",
};

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
  `/art/opponents/${id}-${mood}.png`;
