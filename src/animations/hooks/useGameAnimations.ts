import { useEffect, useRef, useState } from "react";
import { GAME_ANIMATIONS } from "../animation.config";
import type {
  ActiveEffect,
  AnimationEvent,
  AnimationOwner,
  GameAnimationEvent,
} from "../animation.types";
import { AnimationQueue } from "../utils/animationQueue";
import {
  positions,
  type PuzzleEngine,
  type Session,
} from "../../game/crossword-engine";

const ownerOf = (o: "p" | "ai" | undefined): AnimationOwner | null =>
  o === "p" ? "player" : o === "ai" ? "ai" : null;

const isPending = (s: Session, k: string) =>
  !!s.letters[k] && !s.locked.includes(k);

/**
 * Eventos de uma transição real do motor, comparando a sessão anterior com a atual. Não altera
 * nenhuma das duas. Uma sessão nova (jogar de novo) ou que "desconfirma" casas não gera eventos.
 */
export function deriveEvents(
  engine: Pick<PuzzleEngine, "solved" | "complete">,
  prev: Session,
  next: Session,
): GameAnimationEvent[] {
  if (prev.locked.some((k) => !next.locked.includes(k))) return [];
  const out: GameAnimationEvent[] = [];
  const newLocked = next.locked.filter((k) => !prev.locked.includes(k));
  for (const k of Object.keys(next.letters))
    if (isPending(next, k) && prev.letters[k] !== next.letters[k])
      out.push({ type: "LETTER_PLACED", cellId: k });
  for (const k of Object.keys(prev.letters))
    if (isPending(prev, k) && !next.letters[k])
      out.push({ type: "LETTER_REMOVED", cellId: k });
  for (const k of newLocked) {
    const owner = ownerOf(next.owners[k]);
    out.push({ type: "LETTER_CONFIRMED", cellId: k, owner });
    // Casa travada sem dono = revelada por Dica.
    if (!owner) out.push({ type: "HINT_REVEALED", cellId: k });
  }
  const before = new Set(engine.solved(prev).map((w) => w.id));
  for (const w of engine.solved(next)) {
    if (before.has(w.id)) continue;
    const cells = positions(w).map((c) => c.key);
    const owners = newLocked
      .filter((k) => cells.includes(k))
      .map((k) => ownerOf(next.owners[k]))
      .filter((o): o is AnimationOwner => !!o);
    const ai = owners.filter((o) => o === "ai").length;
    out.push({
      type: "WORD_COMPLETED",
      wordId: w.id,
      owner: ai > owners.length - ai ? "ai" : "player",
      assisted: owners.length === 0,
      cells,
    });
  }
  if (prev.versus.turn !== next.versus.turn)
    out.push({
      type: "TURN_CHANGED",
      turn: next.versus.turn === "ai" ? "ai" : "player",
    });
  if (engine.complete(next) && !engine.complete(prev))
    out.push({
      type: "PUZZLE_COMPLETED",
      result:
        next.scores.p === next.scores.ai
          ? "draw"
          : next.scores.p > next.scores.ai
            ? "win"
            : "loss",
    });
  return out;
}

/** Moedas que voam até o saldo e intervalo entre elas (ms). */
export const COIN_COUNT = 7;
export const COIN_STAGGER = 60;

export const durationOf = (e: AnimationEvent) => {
  switch (e.type) {
    case "LETTER_PLACED":
      return GAME_ANIMATIONS.tilePlace;
    case "WORD_COMPLETED":
      return GAME_ANIMATIONS.wordComplete;
    case "LETTER_REJECTED":
      return GAME_ANIMATIONS.incorrect;
    case "HINT_REVEALED":
      return GAME_ANIMATIONS.hintReveal;
    case "TILE_SWAP_OUT":
      return GAME_ANIMATIONS.tileSwap;
    case "TURN_CHANGED":
      return GAME_ANIMATIONS.turnChange;
    case "COINS_EARNED":
      return GAME_ANIMATIONS.coinReward + COIN_STAGGER * (COIN_COUNT - 1);
    case "PUZZLE_COMPLETED":
      return GAME_ANIMATIONS.victory;
    default:
      return 0;
  }
};

interface Options {
  engine?: PuzzleEngine;
  session?: Session;
  sessionKey: string;
  enabled: boolean;
  /** Saldo do jogador: um aumento na jogada que conclui a partida vira COINS_EARNED. */
  coins?: number;
}

/**
 * Observa a sessão e mantém a lista de efeitos em exibição. A primeira sessão vista (montagem,
 * restauração, recarga) é só a linha de base: nada é reproduzido. Nunca escreve no estado do jogo.
 */
export function useGameAnimations({
  engine,
  session,
  sessionKey,
  enabled,
  coins = 0,
}: Options) {
  const queue = useRef<AnimationQueue | undefined>(undefined);
  queue.current ??= new AnimationQueue();
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const prev = useRef<{ key: string; session: Session } | null>(null);
  const revision = useRef(0);
  const lastCoins = useRef(coins);

  useEffect(() => {
    const q = queue.current!;
    const off = q.subscribe(setEffects);
    return () => {
      off();
      q.dispose();
    };
  }, []);

  /** Enfileira eventos que o estado não mostra (ex.: letra rejeitada) ou que trazem geometria. */
  const emit = (events: GameAnimationEvent[]) => {
    if (!enabled || !events.length) return;
    revision.current += 1;
    const rev = revision.current;
    queue.current!.push(
      events.map((e, i) => ({
        ...e,
        id: `${sessionKey}#${rev}:${e.type}:${"wordId" in e ? e.wordId : "cellId" in e ? e.cellId : i}`,
        sessionKey,
        revision: rev,
      })),
      durationOf,
    );
  };

  useEffect(() => {
    if (!engine || !session) return;
    const before = prev.current;
    const coinsBefore = lastCoins.current;
    prev.current = { key: sessionKey, session };
    lastCoins.current = coins;
    if (!before || before.key !== sessionKey || before.session === session)
      return;
    const events: GameAnimationEvent[] = deriveEvents(
      engine,
      before.session,
      session,
    );
    // A recompensa já foi paga pelo motor/estado; aqui só se anima o aumento do saldo, uma vez,
    // na transição em que a partida passa a `claimed`.
    if (!before.session.claimed && session.claimed && coins > coinsBefore)
      events.push({ type: "COINS_EARNED", amount: coins - coinsBefore });
    emit(events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionKey, coins]);

  return { effects, emit };
}
