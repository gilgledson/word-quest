import { useLayoutEffect, useState, type CSSProperties } from "react";
import { ANIMATION_COLORS, GAME_ANIMATIONS } from "../animation.config";
import type { Rect } from "../animation.types";
import { measureCells, measureElement } from "../utils/animationGeometry";

interface Props {
  container: HTMLElement | null;
  cellId: string;
  reduced: boolean;
}

/** Estrelinha dourada que sai do botão Dica e acende a casa revelada. */
export function HintRevealEffect({ container, cellId, reduced }: Props) {
  const [geo, setGeo] = useState<{
    start: { x: number; y: number };
    cell: Rect;
    dx: number;
    dy: number;
  } | null>(null);
  useLayoutEffect(() => {
    if (!container) return;
    const cell = measureCells(container, [cellId])?.rect;
    const button = container.querySelector('[aria-label="Dica"]');
    if (!cell) return;
    const from = button ? measureElement(container, button) : cell;
    const start = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    setGeo({
      start,
      cell,
      dx: cell.x + cell.w / 2 - start.x,
      dy: cell.y + cell.h / 2 - start.y,
    });
  }, [container, cellId]);
  if (!geo) return null;
  const vars = {
    "--fx-gold": ANIMATION_COLORS.gold,
    "--fx-total": `${GAME_ANIMATIONS.hintReveal}ms`,
  } as CSSProperties;
  return (
    <>
      <span
        className={`fx-hint-glow ${reduced ? "reduced" : ""}`}
        style={{
          ...vars,
          left: geo.cell.x,
          top: geo.cell.y,
          width: geo.cell.w,
          height: geo.cell.h,
        }}
        aria-hidden="true"
        data-testid="fx-hint-glow"
      />
      {!reduced && (
        <span
          className="fx-star"
          aria-hidden="true"
          data-testid="fx-star"
          style={
            {
              ...vars,
              left: geo.start.x,
              top: geo.start.y,
              "--tx": `${geo.dx}px`,
              "--ty": `${geo.dy}px`,
            } as CSSProperties
          }
        >
          ★
        </span>
      )}
    </>
  );
}
