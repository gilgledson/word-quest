import {
  economy,
  type PuzzleEngine,
  type Session,
} from "../../game/crossword-engine";
import type { Player } from "../../services/repository";

interface Context {
  engine: PuzzleEngine;
  puzzleId: string;
  sessionKey: string;
  daily: boolean;
  casual: boolean;
  date: string;
  /** Baú do mundo desta fase, quando ela é a do chefe (campanha). */
  chest?: { world: string; coins: number };
}
/**
 * Grava a sessão no jogador, cobra `cost` moedas e, quando a grade acaba pela primeira vez,
 * paga a recompensa do duelo (uma vez por fase e nível), abre o baú do mundo ao vencer o chefe e
 * libera a próxima fase.
 */
export function settleSession(
  p: Player,
  next: Session,
  cost: number,
  { engine, puzzleId, sessionKey, daily, casual, date, chest }: Context,
): Player {
  const settled = { ...next };
  if (p.coins < cost) return p;
  let coins = p.coins - cost;
  let stars = p.stars;
  let days = p.daily;
  let duels = p.duels;
  let chests = p.chests ?? [];
  if (engine.complete(settled) && !settled.claimed) {
    const { p: mine, ai } = settled.scores;
    const result = mine > ai ? "win" : mine === ai ? "draw" : "loss";
    if (daily) {
      // Desafio do dia: só a vitória conta, uma vez por dia.
      if (result === "win" && !days.includes(date)) {
        coins += economy.daily;
        days = [...days, date];
      }
    } else if (!(sessionKey in duels)) {
      coins += economy.duel[result];
      duels = { ...duels, [sessionKey]: result };
    }
    // Vencer o oponente conclui a fase e libera a próxima (o modo casual não tem progresso).
    if (result === "win" && !daily && !casual)
      stars = {
        ...stars,
        [puzzleId]: Math.max(
          stars[puzzleId] ?? 0,
          economy.duelStars[settled.versus.level],
        ),
      };
    // Vencer o chefe abre o baú do mundo (uma vez por mundo, mesmo que se jogue de novo).
    if (result === "win" && chest && !chests.includes(chest.world)) {
      coins += chest.coins;
      chests = [...chests, chest.world];
      settled.chest = chest.coins;
    }
    settled.claimed = true;
  }
  return {
    ...p,
    coins,
    stars,
    daily: days,
    duels,
    chests,
    sessions: { ...p.sessions, [sessionKey]: settled },
  };
}
