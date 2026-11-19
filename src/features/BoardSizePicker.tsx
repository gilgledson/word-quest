import { BOARD_SIZES, type BoardSize } from "../game/online";

/**
 * Escolha do tamanho do tabuleiro do duelo: ícone, tamanho, ritmo e duração de cada um. Os ícones
 * (public/art/tabuleiros, gerados no ChatGPT) estão na mesma escala: o 8×10 aparece maior que o 6×6.
 */
export function BoardSizePicker({
  value,
  onChange,
}: {
  value: BoardSize;
  onChange: (size: BoardSize) => void;
}) {
  return (
    <>
      <h2 id="escolha-tamanho">Tamanho do tabuleiro</h2>
      <div
        className="board-sizes"
        role="radiogroup"
        aria-labelledby="escolha-tamanho"
      >
        {BOARD_SIZES.map((s) => {
          const label = `${s.cols}×${s.rows}`;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={value === s.id}
              aria-label={`${label}, ${s.nome}, ${s.tempo.replace("~", "cerca de ")}`}
              className={value === s.id ? "selected" : ""}
              onClick={() => onChange(s.id)}
            >
              <img
                className="board-size-icon"
                src={`/art/tabuleiros/${s.id}.webp`}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
              <b>{label}</b>
              <span className="board-size-name">{s.nome}</span>
              <small>{s.tempo}</small>
            </button>
          );
        })}
      </div>
    </>
  );
}
