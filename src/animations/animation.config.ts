/** Durações (ms) e cores de todas as animações do jogo: nenhum componente repete esses valores. */
export const GAME_ANIMATIONS = {
  tileSelect: 120,
  tilePlace: 220,
  wordSelect: 180,
  confirm: 250,
  incorrect: 350,
  wordComplete: 1050,
  hintReveal: 550,
  wordReveal: 650,
  tileSwap: 450,
  tileAdd: 350,
  turnChange: 400,
  coinReward: 700,
  victory: 1800,
} as const;

/** Intervalo entre os contornos de duas palavras fechadas na mesma jogada. */
export const WORD_STAGGER = 180;

export const ANIMATION_COLORS = {
  player: { main: "#2589FF", glow: "#75C9FF" },
  ai: { main: "#7045C8", glow: "#B59CFF" },
  gold: "#FFD54A",
  wrong: "#FF7A6B",
} as const;
