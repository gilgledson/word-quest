import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Casas fixas do banco de letras: cada peça tem o seu lugar, e quando uma sai (para a grade) o
 * lugar fica vazio em vez de as outras deslizarem para fechar o buraco. A peça que volta
 * (letra devolvida, errada, jogada desfeita) retorna ao lugar em que estava; peças novas
 * ocupam o primeiro lugar vazio.
 */
export function reconcileSlots(
  previous: (string | null)[],
  ids: string[],
  remembered: Record<string, number>,
  size: number,
): (string | null)[] {
  const slots: (string | null)[] = Array(Math.max(size, ids.length)).fill(null);
  const present = new Set(ids);
  // Quem já estava no banco continua onde estava.
  previous.forEach((id, i) => {
    if (id && present.has(id)) slots[i] = id;
  });
  const placed = new Set(slots.filter(Boolean));
  for (const id of ids) {
    if (placed.has(id)) continue;
    const back = remembered[id];
    const index =
      back !== undefined && slots[back] === null ? back : slots.indexOf(null);
    slots[index] = id;
    placed.add(id);
  }
  return slots;
}

const same = (a: (string | null)[], b: (string | null)[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

/** Posição de cada peça do banco em casas fixas (`null` = casa vazia). */
export function useRackSlots(ids: string[], size: number) {
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const remembered = useRef<Record<string, number>>({});
  const key = ids.join("|");
  // Calculado na própria renderização a partir do último estado confirmado: sem quadro "torto".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(
    () => reconcileSlots(slots, ids, remembered.current, size),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, key, size],
  );
  useEffect(() => {
    view.forEach((id, i) => {
      if (id) remembered.current[id] = i;
    });
    if (!same(view, slots)) setSlots(view);
  }, [view, slots]);
  return view;
}
