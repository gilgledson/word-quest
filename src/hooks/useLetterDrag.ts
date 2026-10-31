import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface DragOrigin {
  tileId: string;
  letter: string;
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
}
/** Estado do arrasto: só muda quando o gesto começa e termina, nunca a cada movimento. */
export interface LetterDrag {
  tileId: string;
  letter: string;
}

/**
 * Pointer capture mantém mouse, caneta e toque vivos fora do banco.
 *
 * Desempenho: a posição do fantasma e o destaque da casa de destino são feitos direto no DOM
 * (sem `setState` por `pointermove`), então a grade não é renderizada de novo a cada movimento.
 * A validação do destino continua em quem recebe `onDrop` (React/motor); o destaque é só
 * feedback transitório e é sempre limpo ao soltar, cancelar ou desmontar.
 */
/** Duração do voo de volta quando a soltura não é aceita. */
export const RETURN_MS = 240;
/** O fantasma nasce 70% acima do ponteiro (translate -70%); o centro dele fica 20% da altura acima. */
const GHOST_LIFT = 12;
export function useLetterDrag(
  /** Devolve `false` quando a soltura foi recusada: o fantasma volta voando ao lugar de origem. */
  onDrop: (tileId: string, cell: string | null) => boolean | void,
) {
  const origin = useRef<DragOrigin | null>(null);
  const suppressClick = useRef(false);
  const ghost = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: -200, y: -200 });
  const marked = useRef<HTMLElement | null>(null);
  const source = useRef<HTMLElement | null>(null);
  const returning = useRef<number>(0);
  const [drag, setDrag] = useState<LetterDrag | null>(null);

  const place = () => {
    if (ghost.current)
      ghost.current.style.transform = `translate3d(${pointer.current.x}px, ${pointer.current.y}px, 0) translate(-50%, -70%)`;
  };
  /** Ref callback do fantasma: ao montar, já nasce na posição do ponteiro. */
  const ghostRef = useCallback((el: HTMLElement | null) => {
    ghost.current = el;
    if (el) place();
  }, []);
  const cellEl = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]") ??
    null;
  const clearMark = () => {
    marked.current?.classList.remove("drop-ready", "drop-invalid");
    marked.current = null;
  };
  const mark = (el: HTMLElement | null) => {
    if (marked.current && marked.current !== el) clearMark();
    if (!el) return;
    marked.current = el;
    el.classList.add(
      el.classList.contains("correct") ? "drop-invalid" : "drop-ready",
    );
  };
  useEffect(
    () => () => {
      clearMark();
      window.clearTimeout(returning.current);
    },
    [],
  );
  /** Encerra o voo de volta (ou o corta, se outro gesto começar antes de ele terminar). */
  const finishReturn = () => {
    if (!returning.current) return;
    window.clearTimeout(returning.current);
    returning.current = 0;
    setDrag(null);
  };
  /** Solta o ponteiro e leva o fantasma de volta ao lugar da letra; sem espaço medido, some na hora. */
  const flyBack = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const el = source.current;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    origin.current = null;
    clearMark();
    const rect = el?.isConnected ? el.getBoundingClientRect() : undefined;
    const calm = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!ghost.current || !rect?.width || calm) {
      setDrag(null);
      return;
    }
    pointer.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2 + GHOST_LIFT,
    };
    ghost.current.style.transition = `transform ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    place();
    returning.current = window.setTimeout(() => {
      returning.current = 0;
      setDrag(null);
    }, RETURN_MS + 20);
  };
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    origin.current = null;
    clearMark();
    setDrag(null);
  };
  return {
    drag,
    ghostRef,
    clickAllowed: (keyboard = false) => {
      if (keyboard) {
        suppressClick.current = false;
        return true;
      }
      if (!suppressClick.current) return true;
      suppressClick.current = false;
      return false;
    },
    bind: (tileId: string, letter: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || event.isPrimary === false || origin.current)
          return;
        suppressClick.current = false;
        finishReturn();
        source.current = event.currentTarget;
        origin.current = {
          tileId,
          letter,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const start = origin.current;
        if (!start || start.pointerId !== event.pointerId) return;
        if (
          !start.moved &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
        )
          return;
        event.preventDefault();
        pointer.current = { x: event.clientX, y: event.clientY };
        if (!start.moved) {
          start.moved = true;
          suppressClick.current = true;
          setDrag({ tileId, letter });
        }
        place();
        mark(cellEl(event.clientX, event.clientY));
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const start = origin.current;
        if (!start || start.pointerId !== event.pointerId) return;
        const target = start.moved
          ? (cellEl(event.clientX, event.clientY)?.dataset.cell ?? null)
          : null;
        if (!start.moved) {
          release(event);
          return;
        }
        if (onDrop(start.tileId, target) === false) flyBack(event);
        else release(event);
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (origin.current?.pointerId === event.pointerId) release(event);
      },
      onLostPointerCapture: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (origin.current?.pointerId === event.pointerId) release(event);
      },
    }),
  };
}
