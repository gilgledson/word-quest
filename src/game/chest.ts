import { economy } from "./engine/types";

/** Baús conquistados: um a cada `chestWords` palavras descobertas. */
export const chestsEarned = (words: number) =>
  Math.floor(words / economy.chestWords);
/** Baús prontos para abrir. */
export const chestsReady = (words: number, opened: number) =>
  Math.max(0, chestsEarned(words) - opened);
/** Palavras que faltam para o próximo baú (0 se já há um pronto). */
export const wordsToNextChest = (words: number, opened: number) =>
  Math.max(0, (opened + 1) * economy.chestWords - words);
/** Prêmio em moedas do baú de ordem `opened` (0 = o primeiro); depois do último da lista o valor se repete. */
export const chestPrize = (opened: number) =>
  economy.chest[Math.min(opened, economy.chest.length - 1)];
/** Total de palavras já descobertas, somando cada fase uma vez só. */
export const wordsFoundCount = (found: Record<string, string[]> | undefined) =>
  Object.values(found ?? {}).reduce((n, ids) => n + ids.length, 0);
