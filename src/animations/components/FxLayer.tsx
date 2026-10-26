import type { CSSProperties } from "react";
import { ANIMATION_COLORS } from "../animation.config";
import type { ActiveEffect } from "../animation.types";
import { CoinRewardEffect } from "./CoinRewardEffect";
import { VictoryWave } from "./VictoryCelebration";
import { HintRevealEffect } from "./HintRevealEffect";
import { LetterRejectEffect } from "./LetterRejectEffect";
import { WordCompletionEffect } from "./WordCompletionEffect";

interface Props {
  effects: ActiveEffect[];
  container: HTMLElement | null;
  reduced: boolean;
}

/**
 * Camada única dos efeitos por cima da partida. `pointer-events: none` no CSS: nenhum efeito
 * captura toque, então o jogador continua jogando enquanto eles rodam.
 */
export function FxLayer({ effects, container, reduced }: Props) {
  return (
    <div className="fx-layer" aria-hidden="true" data-testid="fx-layer">
      {effects.map(({ event, delay }) => {
        switch (event.type) {
          case "WORD_COMPLETED":
            return (
              <WordCompletionEffect
                key={event.id}
                container={container}
                cells={event.cells}
                owner={event.owner}
                assisted={event.assisted}
                reduced={reduced}
                delay={delay}
              />
            );
          case "LETTER_REJECTED":
            return (
              <LetterRejectEffect
                key={event.id}
                container={container}
                cellId={event.cellId}
                letter={event.letter}
                reduced={reduced}
              />
            );
          case "HINT_REVEALED":
            return (
              <HintRevealEffect
                key={event.id}
                container={container}
                cellId={event.cellId}
                reduced={reduced}
              />
            );
          case "TILE_SWAP_OUT":
            return (
              <span
                key={event.id}
                className={`fx-swap-out ${reduced ? "reduced" : ""}`}
                style={
                  {
                    left: event.rect.x,
                    top: event.rect.y,
                    width: event.rect.w,
                    height: event.rect.h,
                    "--fx-gold": ANIMATION_COLORS.gold,
                  } as CSSProperties
                }
              >
                {event.letter}
              </span>
            );
          case "COINS_EARNED":
            return (
              <CoinRewardEffect
                key={event.id}
                container={container}
                amount={event.amount}
                reduced={reduced}
              />
            );
          case "PUZZLE_COMPLETED":
            return (
              <VictoryWave
                key={event.id}
                container={container}
                result={event.result}
                reduced={reduced}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
