import { useLayoutEffect, useState, type CSSProperties } from "react";
import { ANIMATION_COLORS, GAME_ANIMATIONS } from "../animation.config";
import type { AnimationOwner, Rect } from "../animation.types";
import { measureCells, perimeterPath } from "../utils/animationGeometry";

interface Props {
  container: HTMLElement | null;
  cells: string[];
  owner: AnimationOwner;
  assisted: boolean;
  reduced: boolean;
  delay: number;
}

/** Brilho nos quatro cantos: dois estalos por canto, abrindo para fora. */
const SPARKS = [
  [-1, -1],
  [-1, -1],
  [1, -1],
  [1, -1],
  [-1, 1],
  [-1, 1],
  [1, 1],
  [1, 1],
] as const;

/**
 * Contorno luminoso de uma palavra fechada: surge (0–150 ms), uma linha de energia percorre o
 * perímetro (150–650), as casas pulsam e soltam faíscas douradas (650–850) e tudo some (850–1050).
 * As posições vêm das casas reais, então valem para palavras horizontais, verticais e tabuleiro
 * girado. O overlay não captura toques e some sozinho quando a fila o remove.
 */
export function WordCompletionEffect({
  container,
  cells,
  owner,
  assisted,
  reduced,
  delay,
}: Props) {
  const [box, setBox] = useState<{ rect: Rect; cells: Rect[] } | null>(null);
  useLayoutEffect(() => {
    if (container) setBox(measureCells(container, cells));
  }, [container, cells]);
  if (!box) return null;
  const { rect, cells: parts } = box;
  const colors = ANIMATION_COLORS[owner];
  const pad = 3;
  const style = {
    left: rect.x - pad,
    top: rect.y - pad,
    width: rect.w + pad * 2,
    height: rect.h + pad * 2,
    "--fx-main": colors.main,
    "--fx-glow": colors.glow,
    "--fx-gold": ANIMATION_COLORS.gold,
    "--fx-delay": `${delay}ms`,
    "--fx-total": `${GAME_ANIMATIONS.wordComplete}ms`,
  } as CSSProperties;
  return (
    <div
      className={`fx-word ${owner} ${assisted ? "assisted" : ""} ${reduced ? "reduced" : ""}`}
      style={style}
      data-testid="fx-word"
      data-x={rect.x}
      data-y={rect.y}
      data-w={rect.w}
      data-h={rect.h}
      aria-hidden="true"
    >
      <svg
        className="fx-word-svg"
        width={rect.w + pad * 2}
        height={rect.h + pad * 2}
        viewBox={`${-pad} ${-pad} ${rect.w + pad * 2} ${rect.h + pad * 2}`}
      >
        <g>
          <path className="fx-frame" d={perimeterPath(rect.w, rect.h)} />
          <path
            className="fx-line fx-line-glow"
            d={perimeterPath(rect.w, rect.h)}
            pathLength={1}
          />
          <path
            className="fx-line"
            d={perimeterPath(rect.w, rect.h)}
            pathLength={1}
          />
        </g>
      </svg>
      {!reduced &&
        !assisted &&
        parts.map((c, i) => (
          <span
            key={i}
            className="fx-cell-pulse"
            style={{
              left: c.x - rect.x + pad,
              top: c.y - rect.y + pad,
              width: c.w,
              height: c.h,
            }}
          />
        ))}
      {!reduced &&
        !assisted &&
        SPARKS.map(([sx, sy], i) => (
          <span
            key={i}
            className="fx-spark"
            style={
              {
                left: sx < 0 ? pad : rect.w + pad,
                top: sy < 0 ? pad : rect.h + pad,
                "--dx": `${sx * (6 + (i % 2) * 8)}px`,
                "--dy": `${sy * (8 + (i % 2) * 6)}px`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}
