export type AnimationOwner = "player" | "ai";

/** Retângulo em pixels, no sistema de coordenadas do contêiner dos efeitos. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GameAnimationEvent =
  | { type: "LETTER_PLACED"; cellId: string }
  | { type: "LETTER_REMOVED"; cellId: string }
  | { type: "LETTER_CONFIRMED"; cellId: string; owner: AnimationOwner | null }
  | { type: "LETTER_REJECTED"; cellId: string; letter: string }
  | {
      type: "WORD_COMPLETED";
      wordId: string;
      owner: AnimationOwner;
      /** Fechada só por Dica: versão discreta. */
      assisted: boolean;
      cells: string[];
    }
  | { type: "HINT_REVEALED"; cellId: string }
  | { type: "TILE_SWAP_OUT"; letter: string; rect: Rect }
  | { type: "TURN_CHANGED"; turn: AnimationOwner }
  | { type: "COINS_EARNED"; amount: number }
  | { type: "PUZZLE_COMPLETED"; result: "win" | "draw" | "loss" };

/**
 * Um evento identifica uma transição específica: `revision` é um contador monotônico mantido
 * pela camada visual (não pelo motor), então o mesmo tipo de evento em jogadas diferentes nunca
 * é confundido, e a mesma transição observada duas vezes (re-render, StrictMode) não repete.
 */
export type AnimationEvent = GameAnimationEvent & {
  id: string;
  sessionKey: string;
  revision: number;
};

export interface ActiveEffect {
  event: AnimationEvent;
  /** Atraso antes de começar (escalonamento entre contornos), em ms. */
  delay: number;
  /** Duração do efeito, em ms. */
  duration: number;
}
