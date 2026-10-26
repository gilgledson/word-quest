import { useLayoutEffect, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { GAME_ANIMATIONS } from "../animation.config";
import type { Rect } from "../animation.types";
import { measureElement } from "../utils/animationGeometry";

/** Título "Fase concluída!" que entra com um pequeno salto. */
export function VictoryBadge({ enabled }: { enabled: boolean }) {
  return (
    <motion.strong
      className="victory-badge"
      initial={enabled ? { opacity: 0, scale: 0.6, y: 8 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
    >
      Fase concluída!
    </motion.strong>
  );
}

/** Estrelas que aparecem uma por vez; o texto continua acessível sem a animação. */
export function VictoryStars({
  count,
  enabled,
  decorative = false,
}: {
  count: number;
  enabled: boolean;
  /** Repetição visual de outra contagem já anunciada: some para leitores de tela. */
  decorative?: boolean;
}) {
  return (
    <span
      className="victory-stars"
      aria-label={decorative ? undefined : `${count} estrelas`}
      aria-hidden={decorative || undefined}
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={enabled ? { opacity: 0, scale: 0.2, rotate: -40 } : false}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            delay: enabled ? 0.25 + i * 0.22 : 0,
            type: "spring",
            stiffness: 420,
            damping: 14,
          }}
        >
          ★
        </motion.span>
      ))}
    </span>
  );
}

/**
 * Onda luminosa que atravessa o tabuleiro quando a partida termina (vitória e empate; na derrota
 * não há efeito). Só transform/opacity, sem capturar toques.
 */
export function VictoryWave({
  container,
  result,
  reduced,
}: {
  container: HTMLElement | null;
  result: "win" | "draw" | "loss";
  reduced: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    const card = container?.querySelector(".board-card");
    if (container && card) setRect(measureElement(container, card));
  }, [container]);
  if (!rect || result === "loss" || reduced) return null;
  return (
    <span
      className={`fx-wave ${result}`}
      data-testid="fx-wave"
      aria-hidden="true"
      style={
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          "--fx-total": `${Math.min(GAME_ANIMATIONS.victory, 1200)}ms`,
        } as CSSProperties
      }
    >
      <i />
    </span>
  );
}
