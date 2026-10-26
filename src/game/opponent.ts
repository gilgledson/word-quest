import {
  positions,
  seededRandom,
  type BotLevel,
  type BotStyle,
  type PuzzleWord,
  type PuzzleEngine,
  type Session,
} from "./crossword-engine";

/**
 * Oponente programado (bot local, sem IA generativa e sem rede). Decide só pelo que o
 * tabuleiro mostra: casas já travadas e tamanho das palavras. A solução é usada pelo
 * motor apenas para concretizar os acertos que o algoritmo já decidiu fazer.
 */
export const OPPONENT_LEVELS: Record<
  BotLevel,
  {
    label: string;
    base: number;
    maxLetters: number;
    /** Quantas palavras o bot tenta por turno antes de passar a vez. */
    attempts: number;
    noise: number;
  }
> = {
  facil: { label: "Fácil", base: 0.35, maxLetters: 2, attempts: 3, noise: 6 },
  medio: { label: "Médio", base: 0.5, maxLetters: 4, attempts: 6, noise: 3 },
  dificil: {
    label: "Difícil",
    base: 0.7,
    maxLetters: 5,
    attempts: 12,
    noise: 1,
  },
};
/**
 * Estilos do oponente (ajustes sobre o nível): o cuidadoso prefere palavras quase prontas e curtas,
 * acerta mais, mas põe menos letras por turno; o agressivo mira palavras longas e abertas,
 * erra mais e põe mais letras quando acerta. Sem estilo (partidas antigas) vale o nível puro.
 */
export const OPPONENT_STYLES: Record<
  BotStyle,
  {
    label: string;
    base: number;
    maxLetters: number;
    attempts: number;
    /** Multiplicadores do ranking de palavras. */
    fill: number;
    length: number;
  }
> = {
  cuidadoso: {
    label: "Cuidadoso",
    base: 0.05,
    maxLetters: -1,
    attempts: 0,
    fill: 1.4,
    length: 1.5,
  },
  agressivo: {
    label: "Agressivo",
    base: -0.12,
    maxLetters: 1,
    attempts: 1,
    fill: 0.5,
    length: 0.3,
  },
};
export const tune = (level: BotLevel, style?: BotStyle) => {
  const lv = OPPONENT_LEVELS[level];
  const st = style ? OPPONENT_STYLES[style] : undefined;
  return {
    base: lv.base + (st?.base ?? 0),
    maxLetters: Math.max(1, lv.maxLetters + (st?.maxLetters ?? 0)),
    attempts: Math.max(1, lv.attempts + (st?.attempts ?? 0)),
    noise: lv.noise,
    fill: st?.fill ?? 1,
    length: st?.length ?? 1,
  };
};
export const FILL_WEIGHT = 0.4;
export const LENGTH_PENALTY = 0.035;
export const successChance = (
  level: BotLevel,
  filled: number,
  length: number,
  style?: BotStyle,
) =>
  Math.min(
    0.97,
    Math.max(
      0.05,
      tune(level, style).base +
        FILL_WEIGHT * (filled / length) -
        LENGTH_PENALTY * length,
    ),
  );

export interface BotPlan {
  /** Palavra escolhida; null quando não há mais nada a jogar. */
  wordId: string | null;
  /** Casas abertas da palavra escolhida (vazio em caso de falha); a mão do bot limita o que entra. */
  cells: string[];
  chance: number;
  success: boolean;
}

interface Candidate {
  word: PuzzleWord;
  cells: { key: string; letter: string }[];
  filled: number;
  length: number;
}

/** Palavras ainda incompletas, da mais atraente para a menos (só olha o que o tabuleiro mostra). */
function rankOpen(
  engine: PuzzleEngine,
  session: Session,
  level: BotLevel,
  rand: () => number,
  style?: BotStyle,
): Candidate[] {
  const { noise, fill, length: lengthBias } = tune(level, style);
  return engine.puzzle.words
    .map((word) => {
      const cells = positions(word);
      const filled = cells.filter((c) => session.locked.includes(c.key)).length;
      return { word, cells, filled, length: cells.length };
    })
    .filter((w) => w.filled < w.length)
    .map((w) => ({
      ...w,
      // Prioridade: palavras mais reveladas e mais curtas, com ruído conforme a dificuldade.
      score:
        (w.filled / w.length) * 10 * fill -
        w.length * 0.4 * lengthBias +
        rand() * noise,
    }))
    .sort((a, b) => b.score - a.score);
}

const openCells = (pick: Candidate, session: Session) =>
  pick.cells.filter((c) => !session.locked.includes(c.key)).map((c) => c.key);

/** O palpite do bot para a palavra mais atraente (sem aplicar nada). */
export function planMove(
  engine: PuzzleEngine,
  session: Session,
  level: BotLevel,
  rand: () => number,
  style?: BotStyle,
): BotPlan {
  const pick = rankOpen(engine, session, level, rand, style)[0];
  if (!pick) return { wordId: null, cells: [], chance: 0, success: false };
  const chance = successChance(level, pick.filled, pick.length, style);
  const success = rand() < chance;
  // Todas as casas abertas da palavra: o motor só coloca as que o bot tem na mão, até o limite.
  return {
    wordId: pick.word.id,
    cells: success ? openCells(pick, session) : [],
    chance,
    success,
  };
}

export interface BotResult {
  session: Session;
  plan: BotPlan;
  gained: number;
  bonus: number;
}

/**
 * Um turno do bot: planeja, confirma pelo motor (inventário compartilhado) e devolve a vez.
 * A seed e o contador ficam na sessão; recarregar a página repete exatamente a mesma jogada.
 */
export function opponentTurn(
  engine: PuzzleEngine,
  session: Session,
): BotResult {
  const versus = session.versus;
  const settings = tune(versus.level, versus.style);
  const rand = seededRandom(versus.seed, versus.rngCount);
  const ranked = rankOpen(engine, session, versus.level, rand, versus.style);
  let base = session;
  let gained = 0;
  let bonus = 0;
  let plan: BotPlan = { wordId: null, cells: [], chance: 0, success: false };
  // Tenta as palavras mais atraentes, em ordem, até esgotar o limite de letras do turno.
  for (const [i, pick] of ranked.slice(0, settings.attempts).entries()) {
    const remaining = settings.maxLetters - gained;
    if (remaining <= 0) break;
    const chance = successChance(
      versus.level,
      pick.filled,
      pick.length,
      versus.style,
    );
    const success = rand() < chance;
    const attempt: BotPlan = {
      wordId: pick.word.id,
      cells: success ? openCells(pick, base) : [],
      chance,
      success,
    };
    if (i === 0) plan = attempt;
    if (!success) continue;
    const played = engine.play(base, attempt.cells, "ai", remaining);
    if (played && played.gained > 0) {
      if (!gained) plan = attempt;
      base = played.session;
      gained += played.gained;
      bonus += played.bonus;
    }
  }
  // Sem nenhuma peça útil na mão, o oponente troca a mão em vez de ficar parado.
  if (!engine.rack.botHasMove(base)) base = engine.exchangeBot(base);
  return {
    session: {
      ...base,
      versus: { ...versus, turn: "p", rngCount: versus.rngCount + 1 },
    },
    plan,
    gained,
    bonus,
  };
}
