import { Check, Lightbulb, Shuffle, SkipForward } from "lucide-react";
import { motion } from "motion/react";
import { economy, type Tile } from "../../game/crossword-engine";
import type { useLetterDrag } from "../../hooks/useLetterDrag";

interface Props {
  rack: Tile[];
  letterDrag: ReturnType<typeof useLetterDrag>;
  /** É a vez do jogador. */
  mine: boolean;
  /** Preferência "Animações" do perfil (entrada das peças). */
  animated: boolean;
  /** Animações ligadas e sem "reduzir movimento" (toque, pulso do ✓). */
  fxEnabled: boolean;
  hasPending: boolean;
  pulse: number;
  hinting: boolean;
  onInsert: (tileId: string) => void;
  onSwap: () => void;
  onConfirm: () => void;
  onHint: () => void;
}
/** Banco de letras e a barra de ações (trocar, confirmar/passar, dica). */
export function TurnControls({
  rack,
  letterDrag,
  mine,
  animated,
  fxEnabled,
  hasPending,
  pulse,
  hinting,
  onInsert,
  onSwap,
  onConfirm,
  onHint,
}: Props) {
  return (
    <>
      <div className="letter-bank" role="group" aria-label="Letras do banco">
        {rack.map((t) => (
          <motion.button
            {...letterDrag.bind(t.id, t.letter)}
            className={letterDrag.drag?.tileId === t.id ? "drag-source" : ""}
            draggable={false}
            disabled={!mine}
            initial={animated ? { scale: 0.6, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={fxEnabled ? { scale: 1.07, y: -4 } : undefined}
            key={t.id}
            data-tile={t.id}
            onClick={(event) => {
              if (letterDrag.clickAllowed(event.detail === 0)) onInsert(t.id);
            }}
            aria-label={`Inserir letra ${t.letter}`}
          >
            {t.letter}
          </motion.button>
        ))}
      </div>
      <div className="puzzle-tools">
        <button
          disabled={!mine || !rack.length}
          onClick={onSwap}
          aria-label="Trocar"
        >
          <Shuffle />
          Trocar <span>{economy.swap} ◉</span>
        </button>
        <motion.button
          className={`confirm-button ${hasPending ? "" : "is-pass"}`}
          disabled={!mine}
          onClick={onConfirm}
          whileTap={fxEnabled ? { scale: 0.94 } : undefined}
          aria-label={hasPending ? "Confirmar" : "Passar a vez"}
        >
          {hasPending ? <Check /> : <SkipForward />}
          <small>{hasPending ? "Confirmar" : "Passar a vez"}</small>
          {fxEnabled && pulse > 0 && (
            <span key={pulse} className="confirm-pulse" aria-hidden="true" />
          )}
        </motion.button>
        <button
          className={hinting ? "fx-hint-btn" : ""}
          disabled={!mine}
          onClick={onHint}
          aria-label="Dica"
        >
          <Lightbulb />
          Dica <span>{economy.hint} ◉</span>
        </button>
      </div>
    </>
  );
}
