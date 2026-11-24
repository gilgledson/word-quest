import { motion } from "motion/react";
import { economy, swapPrice, type Tile } from "../../game/crossword-engine";
import { MT } from "../../i18n/match";

interface Props {
  rack: Tile[];
  selected: string[];
  cost: number;
  /** Moedas do jogador, para mostrar o saldo depois da troca. */
  coins: number;
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
  coins,
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
        aria-label={MT.swapTitle}
        initial={animated ? { opacity: 0, scale: 0.94, y: 8 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <h2>{MT.swapTitle}</h2>
        <p>
          {MT.swapRules(
            economy.swapMax,
            economy.swap
              .map((_, i) => MT.swapPrice(i + 1, swapPrice(i + 1)))
              .join(" · "),
          )}
        </p>
        <div className="swap-tiles">
          {rack.map((t) => (
            <button
              key={t.id}
              aria-pressed={selected.includes(t.id)}
              aria-label={MT.swapLetter(t.letter)}
              onClick={() => onToggle(t.id)}
            >
              {t.letter}
            </button>
          ))}
        </div>
        <p className="swap-count" aria-live="polite">
          {MT.selected(selected.length, economy.swapMax)}
        </p>
        <p className="swap-cost" aria-live="polite">
          {MT.cost(cost)}
          <span className={coins < cost ? "short" : ""}>
            {coins < cost ? MT.short(coins) : MT.after(coins - cost)}
          </span>
        </p>
        <div className="swap-actions">
          <button onClick={onCancel}>{MT.cancel}</button>
          <button
            className="primary"
            disabled={!selected.length || !canSwap}
            onClick={onConfirm}
          >
            {selected.length ? MT.swapFor(cost) : MT.pickLetters}
          </button>
        </div>
        {!!selected.length && !canSwap && (
          <p role="status" className="swap-note">
            {MT.swapNone}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
