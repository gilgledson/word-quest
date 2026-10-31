import {
  economy,
  positions,
  type PuzzleEngine,
  type Session,
} from "../../game/crossword-engine";
import {
  HISTORY_MAX,
  type GameRecord,
  type Player,
} from "../../services/repository";

interface Context {
  engine: PuzzleEngine;
  puzzleId: string;
  sessionKey: string;
  daily: boolean;
  casual: boolean;
  date: string;
}
/**
 * Grava a sessão no jogador, cobra `cost` moedas e, quando a grade acaba pela primeira vez,
 * paga a recompensa do duelo (uma vez por fase e nível) e libera a próxima fase.
 */
export function settleSession(
  p: Player,
  next: Session,
  cost: number,
  { engine, puzzleId, sessionKey, daily, casual, date }: Context,
): Player {
  const settled = { ...next };
  if (p.coins < cost) return p;
  let coins = p.coins - cost;
  let stars = p.stars;
  let days = p.daily;
  let duels = p.duels;
  let history = p.history ?? [];
  const wordsFound = discover(p, next, engine, puzzleId, sessionKey);
  if (engine.complete(settled) && !settled.claimed) {
    const { p: mine, ai } = settled.scores;
    const result = (
      mine > ai ? "win" : mine === ai ? "draw" : "loss"
    ) as GameRecord["result"];
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
    history = [
      {
        puzzleId,
        opponent: settled.versus.opponent,
        result,
        p: mine,
        ai,
        date,
      },
      ...history,
    ].slice(0, HISTORY_MAX);
    settled.claimed = true;
  }
  return {
    ...p,
    coins,
    stars,
    daily: days,
    duels,
    history,
    wordsFound,
    sessions: { ...p.sessions, [sessionKey]: settled },
  };
}
/**
 * Palavras que o jogador fechou nesta jogada (ao menos uma casa nova dela é dele), ainda não
 * descobertas naquela fase: refazer a fase não conta de novo.
 */
function discover(
  p: Player,
  next: Session,
  engine: PuzzleEngine,
  puzzleId: string,
  sessionKey: string,
) {
  const found = p.wordsFound ?? {};
  const before = p.sessions[sessionKey];
  const solvedBefore = new Set(
    before ? engine.solved(before).map((w) => w.id) : [],
  );
  const fresh = new Set(
    next.locked.filter(
      (k) => !before?.locked.includes(k) && next.owners[k] === "p",
    ),
  );
  const known = new Set(found[puzzleId] ?? []);
  const added = engine
    .solved(next)
    .filter(
      (w) =>
        !solvedBefore.has(w.id) &&
        !known.has(w.id) &&
        positions(w).some((c) => fresh.has(c.key)),
    )
    .map((w) => w.id);
  return added.length ? { ...found, [puzzleId]: [...known, ...added] } : found;
}
