import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MT } from "../i18n/match";

/** Distância (px) que o dedo precisa arrastar para o card sair e dar lugar ao seguinte. */
const SWIPE = 64;
/** Arrasto mínimo antes de o baralho capturar o ponteiro: abaixo disso, é um toque nos botões do card. */
const SLOP = 8;

/**
 * Baralho de cards: um por vez, com os próximos empilhados atrás. Troca-se de card arrastando para
 * os lados, pelas setas ou pelas teclas ← →. Todos os itens ficam na lista (o conteúdo segue no
 * documento), mas só o da frente recebe toque e foco.
 */
export function Deck<T>({
  items,
  keyOf,
  label,
  render,
  className = "",
  cardProps,
}: {
  items: T[];
  keyOf: (item: T) => string;
  /** Nome da lista para leitores de tela (ex.: "Rivais"). */
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
  /** Classe e atributos data-* de cada card (ex.: a cor do tema). */
  cardProps?: (item: T) => {
    className?: string;
    /** Variáveis de CSS do card (ex.: as cores de um tema baixado). */
    style?: Record<string, string>;
    [data: `data-${string}`]: string;
  };
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const from = useRef<number | null>(null);
  const n = items.length;
  const at = Math.min(index, n - 1);
  const go = (step: number) => setIndex((at + step + n) % n);
  const down = (e: PointerEvent<HTMLUListElement>) => {
    from.current = e.clientX;
  };
  const move = (e: PointerEvent<HTMLUListElement>) => {
    if (from.current === null) return;
    const dx = e.clientX - from.current;
    if (!drag && Math.abs(dx) < SLOP) return;
    if (!drag) e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag(dx);
  };
  const up = () => {
    if (from.current === null) return;
    from.current = null;
    if (Math.abs(drag) >= SWIPE) go(drag < 0 ? 1 : -1);
    setDrag(0);
  };
  if (!n) return null;
  return (
    <div
      className={`deck ${className}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <ul
        className="deck-stack"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {items.map((item, i) => {
          const pos = (i - at + n) % n;
          const top = pos === 0;
          const {
            className: extra = "",
            style: vars,
            ...data
          } = cardProps?.(item) ?? {};
          return (
            <li
              key={keyOf(item)}
              {...data}
              className={`deck-card ${extra} ${top && drag ? "dragging" : ""}`}
              data-pos={
                top ? "0" : pos === 1 ? "next" : pos === n - 1 ? "prev" : "off"
              }
              inert={!top}
              style={{
                ...vars,
                ...(top && drag
                  ? {
                      transform: `translateX(${drag}px) rotate(${drag / 22}deg)`,
                    }
                  : {}),
              }}
            >
              {render(item)}
            </li>
          );
        })}
      </ul>
      {n > 1 && (
        <div className="deck-nav">
          <button
            type="button"
            aria-label={MT.previousIn(label)}
            onClick={() => go(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="deck-dots" aria-hidden="true">
            {items.map((item, i) => (
              <i key={keyOf(item)} className={i === at ? "on" : ""} />
            ))}
          </span>
          <span className="sr-only" aria-live="polite">
            {MT.nOfM(at + 1, n)}
          </span>
          <button
            type="button"
            aria-label={MT.nextIn(label)}
            onClick={() => go(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
