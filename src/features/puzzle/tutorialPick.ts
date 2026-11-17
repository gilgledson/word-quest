import {
  economy,
  positions,
  PuzzleValidator,
  type Puzzle,
  type PuzzleWord,
  type Session,
} from "../../game/crossword-engine";

/**
 * Palavra que o tutorial da fase 1 dá de graça. Depende só da grade (é a mesma a cada abertura e
 * ao retomar a partida): horizontal, de 3 a 5 letras (cabe no banco), de preferência com 4, com
 * menos cruzamentos e menos letras repetidas; no empate, a primeira da lista. Sem candidata, o
 * tutorial volta ao modelo anterior (`tutorialPick`).
 */
export function tutorialWord(puzzle: Puzzle): PuzzleWord | undefined {
  const cellsOf = new Map<string, number>();
  for (const w of puzzle.words)
    for (const c of positions(w))
      cellsOf.set(c.key, (cellsOf.get(c.key) ?? 0) + 1);
  const score = (w: PuzzleWord) => {
    const cells = positions(w);
    return [
      Math.abs(cells.length - 4),
      cells.filter((c) => (cellsOf.get(c.key) ?? 0) > 1).length,
      cells.length - new Set(cells.map((c) => c.letter)).size,
    ];
  };
  const candidates = puzzle.words.filter((w) => {
    const n = positions(w).length;
    return (
      w.direction === "horizontal" &&
      n >= 3 &&
      n <= Math.min(5, economy.rackMax)
    );
  });
  // Comparação critério a critério; só troca se for estritamente melhor (o empate fica com a primeira).
  const before = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };
  let best: { word: PuzzleWord; rank: number[] } | undefined;
  for (const word of candidates) {
    const rank = score(word);
    if (!best || before(rank, best.rank)) best = { word, rank };
  }
  return best?.word;
}

export type GuidedCell = { key: string; letter: string };
/** Andamento da palavra do tutorial, lido da grade casa a casa (peças de mesma letra se equivalem). */
export type GuidedState = {
  wordId: string;
  cells: GuidedCell[];
  /** Casas com a letra certa (pendente ou confirmada). */
  filled: number;
  missing: number;
  /** Próxima casa vazia, na ordem da palavra. */
  next?: GuidedCell;
  /** Todas as casas com a letra certa e alguma ainda não confirmada. */
  complete: boolean;
  /** Todas as casas confirmadas (`session.locked`). */
  confirmed: boolean;
};
export function guided(word: PuzzleWord, session: Session): GuidedState {
  const cells = positions(word).map((c) => ({ key: c.key, letter: c.letter }));
  const right = cells.filter((c) => session.letters[c.key] === c.letter);
  const confirmed = cells.every((c) => session.locked.includes(c.key));
  return {
    wordId: word.id,
    cells,
    filled: right.length,
    missing: cells.length - right.length,
    next: cells.find((c) => !session.letters[c.key]),
    complete: right.length === cells.length && !confirmed,
    confirmed,
  };
}

/**
 * Palavra e casa para o tutorial da fase 1: uma casa vazia cuja letra o jogador TEM no banco.
 * Entre as palavras ainda abertas, vale a que o banco preenche em mais casas (a primeira jogada já
 * rende pontos); o curinga não conta, porque o passo pede uma letra específica.
 */
export function tutorialPick(
  puzzle: Puzzle,
  session: Session,
): { wordId: string; cell: string } | undefined {
  const inBank = new Map<string, number>();
  for (const id of session.rack) {
    const t = session.tiles[id];
    if (!t.joker) inBank.set(t.letter, (inBank.get(t.letter) ?? 0) + 1);
  }
  let best: { wordId: string; cell: string; covered: number } | undefined;
  for (const w of puzzle.words) {
    if (PuzzleValidator.correct(w, session)) continue;
    const left = new Map(inBank);
    let cell: string | undefined;
    let covered = 0;
    for (const c of positions(w)) {
      if (session.letters[c.key]) continue;
      const n = left.get(c.letter) ?? 0;
      if (!n) continue;
      left.set(c.letter, n - 1);
      covered++;
      cell ??= c.key;
    }
    if (cell && (!best || covered > best.covered))
      best = { wordId: w.id, cell, covered };
  }
  return best && { wordId: best.wordId, cell: best.cell };
}

/**
 * O guia ainda serve: a palavra não foi confirmada e o banco tem as letras de todas as casas que
 * faltam (peças de mesma letra se equivalem). Uma sessão antiga, de antes do guia, cai fora.
 */
export function guideUsable(state: GuidedState, session: Session) {
  if (state.confirmed) return false;
  const bank = new Map<string, number>();
  for (const id of session.rack) {
    const t = session.tiles[id];
    if (!t.joker) bank.set(t.letter, (bank.get(t.letter) ?? 0) + 1);
  }
  for (const c of state.cells) {
    if (session.letters[c.key]) continue;
    const n = bank.get(c.letter) ?? 0;
    if (!n) return false;
    bank.set(c.letter, n - 1);
  }
  return true;
}
