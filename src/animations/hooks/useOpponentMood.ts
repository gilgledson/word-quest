import { useEffect, useRef, useState } from "react";
import type { PuzzleEngine, Session } from "../../game/crossword-engine";
import type { Mood } from "../../game/opponents";
import { deriveEvents } from "./useGameAnimations";

/** Quanto tempo uma reação dura antes de o rosto voltar ao neutro (ms). */
export const MOOD_HOLD = 1800;

/** Humor final da partida, do ponto de vista do oponente (ou do jogador, com `who: "p"`). */
export const finalMood = (
  s: Pick<Session, "scores">,
  who: "ai" | "p" = "ai",
): Mood => {
  if (s.scores.p === s.scores.ai) return "surprised";
  const won =
    who === "ai" ? s.scores.ai > s.scores.p : s.scores.p > s.scores.ai;
  return won ? "happy" : "sad";
};

/**
 * Reação do oponente a uma transição real da partida (comparando a sessão anterior com a atual).
 * Devolve null quando nada muda o humor.
 */
export function reactionTo(
  engine: Pick<PuzzleEngine, "solved" | "complete">,
  prev: Session,
  next: Session,
  who: "ai" | "p" = "ai",
): Mood | null {
  if (engine.complete(next) && !engine.complete(prev))
    return finalMood(next, who);
  const events = deriveEvents(engine, prev, next);
  if (who === "p") return playerReaction(events, prev, next);
  const aiPlayed = events.some(
    (e) => e.type === "LETTER_CONFIRMED" && e.owner === "ai",
  );
  const playerClosed = events.some(
    (e) => e.type === "WORD_COMPLETED" && e.owner === "player" && !e.assisted,
  );
  if (aiPlayed) return "happy";
  // O jogador fechou uma palavra: o oponente fica bravo se está perdendo, surpreso se não.
  if (playerClosed)
    return next.scores.p > next.scores.ai ? "angry" : "surprised";
  // O oponente jogou e não conseguiu nada: frustrado.
  if (prev.versus.turn === "ai" && next.versus.turn === "p") return "angry";
  if (prev.versus.turn === "p" && next.versus.turn === "ai") return "thinking";
  return null;
}

/** Reação do jogador (o avatar dele): vibra com os próprios acertos e se irrita com os do oponente. */
function playerReaction(
  events: ReturnType<typeof deriveEvents>,
  prev: Session,
  next: Session,
): Mood | null {
  const closed = (o: "player" | "ai") =>
    events.some(
      (e) => e.type === "WORD_COMPLETED" && e.owner === o && !e.assisted,
    );
  const played = (o: "player" | "ai") =>
    events.some((e) => e.type === "LETTER_CONFIRMED" && e.owner === o);
  if (closed("player") || played("player")) return "happy";
  if (closed("ai")) return "angry";
  if (played("ai")) return "surprised";
  // Letra errada confirmada custou ponto: o jogador fica triste.
  if (next.scores.p < prev.scores.p) return "sad";
  return null;
}

/**
 * Humor do oponente para o rosto animado. A primeira sessão vista (abrir, restaurar, recarregar)
 * é só linha de base: partida já terminada mostra o humor final, o resto começa neutro.
 */
export function useOpponentMood(opts: {
  engine?: PuzzleEngine;
  session?: Session;
  botTurn: boolean;
  enabled?: boolean;
  /** De quem é o rosto: do oponente ("ai", padrão) ou do jogador ("p"). */
  who?: "ai" | "p";
}) {
  const { engine, session, botTurn, enabled = true, who = "ai" } = opts;
  const prev = useRef<Session | undefined>(undefined);
  const [reaction, setReaction] = useState<{ mood: Mood; key: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const count = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!engine || !session) return;
    const before = prev.current;
    prev.current = session;
    if (!before) {
      if (engine.complete(session))
        setReaction({ mood: finalMood(session, who), key: 0 });
      return;
    }
    if (before === session || !enabled) return;
    const mood = reactionTo(engine, before, session, who);
    if (!mood) return;
    count.current += 1;
    setReaction({ mood, key: count.current });
    clearTimeout(timer.current);
    // O humor final fica; as reações passageiras voltam ao neutro.
    if (!engine.complete(session))
      timer.current = setTimeout(() => setReaction(null), MOOD_HOLD);
  }, [session, engine, enabled, who]);

  const done = !!engine && !!session && engine.complete(session);
  // O oponente "pensa" na vez dele; o jogador não tem o humor de pensando.
  const thinking = who === "ai" && botTurn;
  const mood: Mood =
    reaction && (done || !thinking || reaction.mood !== "thinking")
      ? reaction.mood
      : thinking
        ? "thinking"
        : "neutral";
  return { mood, key: reaction?.key ?? 0 };
}
