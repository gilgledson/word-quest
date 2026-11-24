import { key, positions, type Puzzle, type Session } from "./crossword-engine";
import { sharedText as t } from "../i18n/result";

/** Página do jogo na Play Store: vai em todo texto compartilhado. */
export const STORE_URL =
  "https://play.google.com/store/apps/details?id=br.com.wordquest.game";

/** Linha do resultado, do ponto de vista de quem compartilha. */
const headline = (p: number, ai: number, rival: string) =>
  p > ai ? t.win(rival) : p === ai ? t.draw(rival) : t.loss(rival);

/** Dias seguidos de desafio vencido até `today` (ou até ontem, se hoje ainda não foi vencido). */
export function currentStreak(days: string[], today: string) {
  const won = new Set(days);
  const at = new Date(`${today}T12:00:00Z`);
  if (!won.has(today)) at.setUTCDate(at.getUTCDate() - 1);
  let streak = 0;
  while (won.has(at.toISOString().slice(0, 10))) {
    streak++;
    at.setUTCDate(at.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Resultado do desafio do dia para compartilhar: placar, uma barra de 10 quadrados com a parte das
 * letras de cada lado (azul o jogador, vermelho o rival), erros, dicas e sequência. Não revela
 * nenhuma palavra.
 */
export function dailyShareText(opts: {
  date: string;
  session: Pick<Session, "owners" | "locked" | "scores" | "hinted" | "misses">;
  rival: string;
  streak: number;
}) {
  const { date, session, rival, streak } = opts;
  const { p, ai } = session.scores;
  const mine = session.locked.filter((k) => session.owners[k] === "p").length;
  const theirs = session.locked.filter(
    (k) => session.owners[k] === "ai",
  ).length;
  const total = mine + theirs;
  // Barra de 10: a parte de cada lado, com pelo menos um quadrado para quem fez alguma letra.
  let blue = total ? Math.round((mine / total) * 10) : 5;
  if (mine && !blue) blue = 1;
  if (theirs && blue === 10) blue = 9;
  const bar = "🟦".repeat(blue) + "🟥".repeat(10 - blue);
  const [, month, day] = date.split("-");
  const hints = (session.hinted ?? []).filter((k) =>
    session.locked.includes(k),
  ).length;
  const habits = [
    ...(session.misses === undefined
      ? []
      : [session.misses ? t.misses(session.misses) : t.noMisses]),
    hints ? t.hints(hints) : t.noHints,
  ].join(" · ");
  return [
    t.dailyTitle(day, month),
    headline(p, ai, rival),
    "",
    bar,
    t.myLetters(mine, rival, theirs),
    "",
    t.score(p, ai),
    habits,
    ...(streak > 1 ? [t.streak(streak)] : []),
    "",
    t.beatMe,
    STORE_URL,
  ].join("\n");
}

/**
 * Letra em quadrado: preenchido (🅰) para as casas do jogador, vazado (🄰) para as do rival. Algumas
 * preenchidas (🅰 🅱 🅾 🅿) têm versão emoji; o seletor de texto (U+FE0E) pede a versão em texto.
 */
const squared = (letter: string, mine: boolean) => {
  const base = letter
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const i = base.charCodeAt(0) - 65;
  if (i < 0 || i > 25) return "■";
  const glyph = String.fromCodePoint((mine ? 0x1f170 : 0x1f130) + i);
  return mine && "ABOP".includes(base) ? `${glyph}\ufe0e` : glyph;
};

/**
 * Pistas e casas vazias, todas como ■. O bloco é mais estreito que as letras em quadrado (75% da
 * largura no Android); o espaço de ¼ de M (U+2005) completa a diferença e mantém as colunas alinhadas.
 */
const BLOCK_CELL = "■\u2005";

/**
 * Tabuleiro terminado para compartilhar (Aventura e Casual): cada letra num quadrado, preenchido
 * as do jogador e vazado as do rival; pistas e casas vazias como ■. Revela as respostas, por
 * isso não é usado no desafio do dia (a mesma grade para todos naquela data).
 */
export function boardShareText(opts: {
  title: string;
  puzzle: Puzzle;
  session: Pick<Session, "owners" | "locked" | "scores">;
  rival: string;
}) {
  const { title, puzzle, session, rival } = opts;
  const { p, ai } = session.scores;
  const letters = new Map<string, string>();
  for (const w of puzzle.words)
    for (const c of positions(w)) letters.set(c.key, c.letter);
  const board = Array.from({ length: puzzle.rows }, (_, r) =>
    Array.from({ length: puzzle.cols }, (_, c) => {
      const k = key(r, c);
      const letter = letters.get(k);
      if (letter && session.locked.includes(k))
        return squared(letter, session.owners[k] !== "ai");
      return BLOCK_CELL;
    }).join(""),
  ).join("\n");
  const best = bestWord(puzzle, session);
  return [
    `🏆 WordQuest · ${title}`,
    headline(p, ai, rival),
    "",
    board,
    t.boardLegend(rival),
    "",
    t.score(p, ai),
    ...(best ? [t.best(best)] : []),
    "",
    t.beatMe,
    STORE_URL,
  ].join("\n");
}

/**
 * A palavra mais longa que o jogador fez sozinho (todas as letras dele); sem nenhuma, a mais longa
 * em que ele pôs alguma letra.
 */
export function bestWord(
  puzzle: Puzzle,
  session: Pick<Session, "owners" | "locked">,
) {
  const mine = (k: string) =>
    session.locked.includes(k) && session.owners[k] === "p";
  const longest = (list: Puzzle["words"]) =>
    list.reduce<Puzzle["words"][number] | undefined>(
      (best, w) => (!best || w.answer.length > best.answer.length ? w : best),
      undefined,
    )?.answer;
  return (
    longest(
      puzzle.words.filter((w) => positions(w).every((c) => mine(c.key))),
    ) ??
    longest(puzzle.words.filter((w) => positions(w).some((c) => mine(c.key))))
  );
}
