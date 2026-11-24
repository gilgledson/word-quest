import { MT } from "../../i18n/match";

/**
 * Resumo da jogada do jogador depois de confirmar, em frases curtas (cabe numa linha):
 * pontos ganhos, pontos perdidos e quantas letras erradas voltaram ao banco.
 */
export function confirmMessage({
  won,
  penalty,
  returned,
}: {
  won: number;
  penalty: number;
  returned: number;
}) {
  return [
    won ? `+${MT.points(won)}` : MT.noRightLetter,
    penalty ? `−${MT.points(penalty)}` : "",
    returned ? MT.returned(returned) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
