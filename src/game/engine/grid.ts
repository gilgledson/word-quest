import type { PuzzleWord } from "./types";
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
