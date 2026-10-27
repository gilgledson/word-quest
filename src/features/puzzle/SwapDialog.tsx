import { motion } from "motion/react";
import { economy, type Tile } from "../../game/crossword-engine";

interface Props {
  rack: Tile[];
  selected: string[];
  cost: number;
  /** Existe uma troca possível para a seleção atual. */
  canSwap: boolean;
  animated: boolean;
  onToggle: (tileId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}
export function SwapDialog({
  rack,
  selected,
  cost,
  canSwap,
  animated,
  onToggle,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <motion.div
      className="swap-backdrop"
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <motion.div
        className="swap-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Trocar letras"
        initial={animated ? { opacity: 0, scale: 0.94, y: 8 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <h2>Trocar letras</h2>
        <p>
          Escolha até {economy.swapMax} peças · {economy.swap} moedas cada
        </p>
        <div className="swap-tiles">
          {rack.map((t) => (
            <button
              key={t.id}
              aria-pressed={selected.includes(t.id)}
              aria-label={`Trocar letra ${t.letter}`}
              onClick={() => onToggle(t.id)}
            >
              {t.letter}
            </button>
          ))}
        </div>
        <p className="swap-cost" aria-live="polite">
          Custo: {cost} moedas
        </p>
        <div className="swap-actions">
          <button onClick={onCancel}>Cancelar</button>
          <button
            className="primary"
            disabled={!selected.length || !canSwap}
            onClick={onConfirm}
          >
            Confirmar troca
          </button>
        </div>
        {!!selected.length && !canSwap && (
          <p role="status" className="swap-note">
            Não há letras diferentes e úteis para esta troca.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
