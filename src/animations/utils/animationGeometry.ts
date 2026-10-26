import type { Rect } from "../animation.types";

type BoxLike = { left: number; top: number; width: number; height: number };

/** Menor retângulo que contém todos os informados. */
export function unionRect(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * Converte um retângulo da tela (getBoundingClientRect) para o sistema local do contêiner que
 * recebe o SVG: subtrai a origem do contêiner e desfaz uma escala de transform, se houver.
 */
export function toLocalRect(
  box: BoxLike,
  container: BoxLike,
  scaleX = 1,
  scaleY = 1,
): Rect {
  return {
    x: (box.left - container.left) / scaleX,
    y: (box.top - container.top) / scaleY,
    w: box.width / scaleX,
    h: box.height / scaleY,
  };
}

/** Contorno retangular a partir do canto superior esquerdo, em sentido horário. */
export function perimeterPath(w: number, h: number): string {
  return `M 0 0 H ${w} V ${h} H 0 Z`;
}

const scaleOf = (rendered: number, layout: number) =>
  layout > 0 && rendered > 0 ? rendered / layout : 1;

/** Retângulo local de um elemento qualquer dentro do contêiner. */
export function measureElement(container: HTMLElement, el: Element): Rect {
  const cr = container.getBoundingClientRect();
  return toLocalRect(
    el.getBoundingClientRect(),
    cr,
    scaleOf(cr.width, container.offsetWidth),
    scaleOf(cr.height, container.offsetHeight),
  );
}

/** Posições reais (já giradas/redimensionadas) das casas de uma palavra, em coordenadas locais. */
export function measureCells(
  container: HTMLElement,
  keys: string[],
): { rect: Rect; cells: Rect[] } | null {
  const cells = keys
    .map((k) => container.querySelector(`[data-cell="${k}"]`))
    .filter((el): el is Element => !!el)
    .map((el) => measureElement(container, el));
  const rect = unionRect(cells);
  return rect ? { rect, cells } : null;
}
