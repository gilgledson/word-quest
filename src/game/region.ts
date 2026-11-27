/**
 * Onde o jogador está, sem pedir permissão de localização: o fuso horário do aparelho e a região do
 * idioma (`en-IN`, `hi-IN`…). Serve só para ordenar o que aparece primeiro (ex.: os avatares da
 * Índia na loja); nada é escondido de ninguém.
 */

/** Fusos da Índia (`Asia/Calcutta` é o nome antigo, ainda usado por alguns aparelhos). */
const INDIA_ZONES = ["Asia/Kolkata", "Asia/Calcutta"];

export interface DeviceHints {
  timeZone?: string;
  languages?: readonly string[];
}

/** Fuso e idiomas do aparelho (vazios quando o ambiente não informa). */
export function deviceHints(): DeviceHints {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  const languages =
    typeof navigator === "undefined"
      ? []
      : [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return { timeZone, languages };
}

/** Região (país) de uma tag de idioma: `en-IN` → `IN`; sem região → undefined. */
const regionOf = (tag: string) => {
  const part = tag.split(/[-_]/)[1];
  return part && /^[a-z]{2}$/i.test(part) ? part.toUpperCase() : undefined;
};

/** País provável do jogador (duas letras), pelo fuso da Índia ou pela região do primeiro idioma. */
export function deviceCountry(
  h: DeviceHints = deviceHints(),
): string | undefined {
  if (h.timeZone && INDIA_ZONES.includes(h.timeZone)) return "IN";
  for (const tag of h.languages ?? []) {
    const r = regionOf(tag);
    if (r) return r;
  }
  return undefined;
}

/** O jogador parece estar na Índia (fuso ou região do idioma). */
export const isIndia = (h: DeviceHints = deviceHints()) =>
  (h.timeZone !== undefined && INDIA_ZONES.includes(h.timeZone)) ||
  (h.languages ?? []).some((t) => regionOf(t) === "IN");
