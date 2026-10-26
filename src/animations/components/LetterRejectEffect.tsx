import { useLayoutEffect, useState, type CSSProperties } from "react";
import { ANIMATION_COLORS, GAME_ANIMATIONS } from "../animation.config";
import type { Rect } from "../animation.types";
import { measureCells, measureElement } from "../utils/animationGeometry";

interface Props {
  container: HTMLElement | null;
  cellId: string;
  letter: string;
  reduced: boolean;
}

/**
 * Letra rejeitada no ✓: a peça treme no lugar, ganha um tom avermelhado e volta voando para o
 * banco. É uma cópia visual; o motor já devolveu a peça ao banco.
 */
export function LetterRejectEffect({
  container,
  cellId,
  letter,
  reduced,
}: Props) {
  const [geo, setGeo] = useState<{ from: Rect; dx: number; dy: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!container) return;
    const from = measureCells(container, [cellId])?.rect;
    const bank = container.querySelector(".letter-bank");
    if (!from) return;
    const to = bank ? measureElement(container, bank) : from;
    setGeo({
      from,
      dx: to.x + to.w / 2 - (from.x + from.w / 2),
      dy: to.y + to.h / 2 - (from.y + from.h / 2),
    });
  }, [container, cellId]);
  if (!geo) return null;
  return (
    <span
      className={`fx-reject ${reduced ? "reduced" : ""}`}
      data-testid="fx-reject"
      aria-hidden="true"
      style={
        {
          left: geo.from.x,
          top: geo.from.y,
          width: geo.from.w,
          height: geo.from.h,
          "--tx": `${geo.dx}px`,
          "--ty": `${geo.dy}px`,
          "--fx-wrong": ANIMATION_COLORS.wrong,
          "--fx-total": `${GAME_ANIMATIONS.incorrect}ms`,
        } as CSSProperties
      }
    >
      {letter}
    </span>
  );
}
