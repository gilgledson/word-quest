import { economy } from "./engine/types";

const TOTAL = economy.chest.length;
/** Baús conquistados: um a cada `chestEvery` vitórias (fases da campanha concluídas). */
export const chestsEarned = (wins: number) =>
  Math.min(TOTAL, Math.floor(wins / economy.chestEvery));
/** Baús prontos para abrir. */
export const chestsReady = (wins: number, opened: number) =>
  Math.max(0, chestsEarned(wins) - opened);
/** Vitórias que faltam para o próximo baú (0 se já há um pronto; null se todos foram abertos). */
export const winsToNextChest = (wins: number, opened: number) =>
  opened >= TOTAL
    ? null
    : Math.max(0, (opened + 1) * economy.chestEvery - wins);
/** Prêmio em moedas do baú de ordem `opened` (0 = o primeiro). */
export const chestPrize = (opened: number) =>
  economy.chest[Math.min(opened, TOTAL - 1)];
