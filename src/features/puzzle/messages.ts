const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

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
    won ? `+${plural(won, "ponto", "pontos")}` : "Nenhuma letra certa",
    penalty ? `−${plural(penalty, "ponto", "pontos")}` : "",
    returned
      ? returned === 1
        ? "1 letra voltou ao banco"
        : `${returned} letras voltaram ao banco`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
