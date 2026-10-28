// Motor do jogo (sem React). O código fica em ./engine/; este arquivo mantém a API pública.
export * from "./engine/types";
export { normalize, key, positions } from "./engine/grid";
export { PuzzleValidator } from "./engine/validator";
export { seededRandom } from "./engine/random";
export { RackManager } from "./engine/rack";
export { PuzzleEngine } from "./engine/engine";
