import { useState, type RefObject } from "react";

export interface ScoreFloat {
  id: number;
  text: string;
  x: number;
  y: number;
  kind: "p" | "ai" | "bonus" | "penalty";
}
let floatId = 0;
/** Pontos flutuantes ("+N", "−N") sobre as casas do tabuleiro e o brilho das casas que pontuaram. */
export function useScoreFloats(
  cardRef: RefObject<HTMLElement | null>,
  animations: boolean,
) {
  const [floats, setFloats] = useState<ScoreFloat[]>([]);
  const [flash, setFlash] = useState<string[]>([]);
  /** Centro das casas, em coordenadas do cartão do tabuleiro. */
  const centerOf = (cells: string[]) => {
    const card = cardRef.current;
    const box = card?.getBoundingClientRect();
    const rects = cells
      .map((k) =>
        card?.querySelector(`[data-cell="${k}"]`)?.getBoundingClientRect(),
      )
      .filter((r): r is DOMRect => !!r);
    const x = rects.length
      ? rects.reduce((n, r) => n + r.left + r.width / 2, 0) / rects.length -
        (box?.left ?? 0)
      : (box?.width ?? 0) / 2;
    const y = rects.length
      ? rects.reduce((n, r) => n + r.top + r.height / 2, 0) / rects.length -
        (box?.top ?? 0)
      : (box?.height ?? 0) / 2;
    return { x, y };
  };
  /** Mostra "−N" sobre as casas das letras erradas devolvidas ao banco. */
  const popPenalty = (cells: string[], points: number) => {
    if (!animations || !cells.length || !points) return;
    const { x, y } = centerOf(cells);
    const made: ScoreFloat[] = [
      { id: ++floatId, text: `−${points}`, x, y, kind: "penalty" },
    ];
    setFloats((f) => [...f, ...made]);
    window.setTimeout(
      () => setFloats((f) => f.filter((x) => !made.some((m) => m.id === x.id))),
      1100,
    );
  };
  /** Mostra "+N" sobre as casas que acabaram de pontuar e dá um brilho nelas. */
  const popScore = (
    cells: string[],
    points: number,
    bonus: number,
    owner: "p" | "ai",
  ) => {
    if (!animations || !cells.length) return;
    const { x, y } = centerOf(cells);
    const made: ScoreFloat[] = [
      { id: ++floatId, text: `+${points}`, x, y, kind: owner },
    ];
    if (bonus)
      made.push({
        id: ++floatId,
        text: `Palavra! +${bonus}`,
        x,
        y: y - 30,
        kind: "bonus",
      });
    setFloats((f) => [...f, ...made]);
    setFlash((f) => [...f, ...cells]);
    window.setTimeout(() => {
      setFloats((f) => f.filter((x) => !made.some((m) => m.id === x.id)));
      setFlash((f) => f.filter((k) => !cells.includes(k)));
    }, 1100);
  };
  return { floats, flash, popScore, popPenalty };
}
