import { useCallback, useRef, useState } from "react";

export type BoardMode = "auto" | "upright" | "rotated";

/**
 * Sizes square cells so the grid fills its container without scrolling.
 * Upright it is cols×rows; rotated (a quarter turn) it is rows×cols. In "auto" mode
 * the orientation that gives the larger cell wins, so a wide container gets the
 * board lying down and a tall one keeps it standing.
 */
export function useFitGrid(
  cols: number,
  rows: number,
  mode: BoardMode = "auto",
  border = 2,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(read);
    observer.current.observe(el);
  }, []);
  const fit = (c: number, r: number) =>
    Math.max(
      1,
      Math.floor(Math.min((size.w - border) / c, (size.h - border) / r)),
    );
  const measured = size.w > 0 && size.h > 0;
  const rotated =
    mode === "rotated" ||
    (mode === "auto" && measured && fit(rows, cols) > fit(cols, rows));
  // jsdom has no layout: fall back to a fixed cell so tests can render the grid.
  const cell = measured ? (rotated ? fit(rows, cols) : fit(cols, rows)) : 40;
  return { ref, cell, rotated };
}
