import type { PuzzleWord } from "./types";
import { hash, random } from "./random";
export const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
export const key = (row: number, col: number) => `${row},${col}`;
export const positions = (word: PuzzleWord) =>
  Array.from(normalize(word.answer), (letter, i) => ({
    key: key(
      word.startRow + (word.direction === "vertical" ? i : 0),
      word.startCol + (word.direction === "horizontal" ? i : 0),
    ),
    letter,
  }));

/** Multiplicador de uma casa especial: a letra posta nela vale o dobro ou o triplo naquela jogada. */
export type Multiplier = 2 | 3;
/**
 * Casas especiais da fase (2× e 3× letra), sempre as mesmas para a mesma fase (sorteio pelo id),
 * para os dois jogadores do duelo ao vivo verem o mesmo tabuleiro: de 2 a 3 casas, uma delas 3×,
 * afastadas umas das outras (distância de pelo menos 3 casas).
 */
export function multipliers(puzzle: {
  id: string;
  words: PuzzleWord[];
}): Record<string, Multiplier> {
  const cells = [
    ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
  ].sort();
  const rand = random(hash(`bonus:${puzzle.id}`));
  const count = Math.min(cells.length, rand() < 0.5 ? 2 : 3);
  const picked: string[] = [];
  const far = (a: string, b: string) => {
    const [r1, c1] = a.split(",").map(Number);
    const [r2, c2] = b.split(",").map(Number);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) >= 3;
  };
  const pool = [...cells];
  while (picked.length < count && pool.length) {
    const k = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    if (picked.every((p) => far(p, k))) picked.push(k);
  }
  return Object.fromEntries(
    picked.map((k, i) => [k, (i === 0 ? 3 : 2) as Multiplier]),
  );
}
