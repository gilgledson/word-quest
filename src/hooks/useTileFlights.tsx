import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RETURN_MS } from "./useLetterDrag";

interface Flight {
  id: number;
  tileId: string;
  letter: string;
  from: DOMRect;
  /** Onde a letra chega; lido já com a tela atualizada (a casa ou o lugar no banco). */
  to: () => DOMRect | null | undefined;
}
const centre = (r: DOMRect) => ({
  x: r.left + r.width / 2,
  y: r.top + r.height / 2,
});

/**
 * Voos curtos de uma letra entre o banco e a grade (tocar numa peça, devolver uma letra,
 * letra errada que volta). Enquanto voa, a peça fica invisível no destino (`flying`).
 * Sem animações, sem movimento reduzido ou sem espaço medido (jsdom), não há voo.
 */
export function useTileFlights(enabled: boolean) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const counter = useRef(0);
  const flying = useMemo(
    () => new Set(flights.map((f) => f.tileId)),
    [flights],
  );
  const launch = useCallback(
    (
      tileId: string,
      letter: string,
      from: DOMRect | null | undefined,
      to: Flight["to"],
    ) => {
      const calm = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!enabled || calm || !from?.width) return;
      setFlights((all) => [
        ...all.filter((f) => f.tileId !== tileId),
        { id: ++counter.current, tileId, letter, from, to },
      ]);
    },
    [enabled],
  );
  const land = useCallback(
    (id: number) => setFlights((all) => all.filter((f) => f.id !== id)),
    [],
  );
  return { flights, flying, launch, land };
}

function FlyingTile({
  flight,
  land,
}: {
  flight: Flight;
  land: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const to = flight.to();
    if (!el || !to?.width) {
      land(flight.id);
      return;
    }
    const at = (r: DOMRect) => {
      const c = centre(r);
      return `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%)`;
    };
    el.style.transform = at(flight.from);
    // Força o estilo inicial antes de ligar a transição.
    void el.getBoundingClientRect();
    el.style.transition = `transform ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.transform = at(to);
    const timer = window.setTimeout(() => land(flight.id), RETURN_MS + 20);
    return () => window.clearTimeout(timer);
    // O voo é montado uma vez; `flight` não muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="tile-flight" aria-hidden="true">
      {flight.letter}
    </div>
  );
}

export function TileFlights({
  flights,
  land,
}: {
  flights: Flight[];
  land: (id: number) => void;
}) {
  if (!flights.length) return null;
  return createPortal(
    <>
      {flights.map((f) => (
        <FlyingTile key={f.id} flight={f} land={land} />
      ))}
    </>,
    document.body,
  );
}
