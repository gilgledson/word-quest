import { Check, Lightbulb, Shuffle, SkipForward } from "lucide-react";
import { motion } from "motion/react";
import { economy, type Tile } from "../../game/crossword-engine";
import { useRackSlots } from "../../hooks/useRackSlots";
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
  /** Peças em voo (da grade para o banco ou o contrário): ficam invisíveis até a letra chegar. */
  flying?: ReadonlySet<string>;
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
  flying,
  onInsert,
  onSwap,
  onConfirm,
  onHint,
}: Props) {
  const slots = useRackSlots(
    rack.map((t) => t.id),
    economy.rackMax,
  );
  const byId = new Map(rack.map((t) => [t.id, t]));
  return (
    <>
      <div className="letter-bank" role="group" aria-label="Letras do banco">
        {slots.map((id, slot) => {
          const t = id ? byId.get(id) : undefined;
          if (!t)
            return (
              <button
                type="button"
                className="slot-empty"
                disabled
                tabIndex={-1}
                aria-hidden="true"
                data-slot={slot}
                key={`slot-${slot}`}
              />
            );
          return (
            <motion.button
              {...letterDrag.bind(t.id, t.joker ? "★" : t.letter)}
              className={`${t.joker ? "joker" : ""} ${letterDrag.drag?.tileId === t.id ? "drag-source" : ""} ${flying?.has(t.id) ? "in-flight" : ""}`}
              draggable={false}
              disabled={!mine}
              initial={animated ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={fxEnabled ? { scale: 1.07, y: -4 } : undefined}
              key={t.id}
              data-tile={t.id}
              data-slot={slot}
              onClick={(event) => {
                if (letterDrag.clickAllowed(event.detail === 0)) onInsert(t.id);
              }}
              aria-label={
                t.joker ? "Inserir curinga" : `Inserir letra ${t.letter}`
              }
            >
              {t.joker ? "★" : t.letter}
            </motion.button>
          );
        })}
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
