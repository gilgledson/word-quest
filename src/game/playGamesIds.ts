/**
 * Ids criados no Play Console (Serviços do Google Play Games) para cada conquista do jogo e para
 * o placar. Vazio = ainda não criado lá: a conquista continua valendo dentro do jogo, só não é
 * enviada ao Play Games. As chaves são os ids de `ACHIEVEMENTS` (src/game/achievements.ts).
 */
export const PLAY_ACHIEVEMENTS: Record<string, string> = {
  "primeiro-passo": "CgkI6tTBz7IFEAIQBg",
  "palavras-25": "CgkI6tTBz7IFEAIQAg",
  "palavras-100": "CgkI6tTBz7IFEAIQCQ",
  "palavras-300": "CgkI6tTBz7IFEAIQAA",
  "duelos-5": "CgkI6tTBz7IFEAIQAw",
  "duelos-20": "CgkI6tTBz7IFEAIQAQ",
  "mao-certeira": "CgkI6tTBz7IFEAIQDA",
  chefe: "CgkI6tTBz7IFEAIQCg",
  "chefes-todos": "CgkI6tTBz7IFEAIQBA",
  "mundo-completo": "CgkI6tTBz7IFEAIQDQ",
  "rivais-6": "CgkI6tTBz7IFEAIQCw",
  "estrelas-30": "CgkI6tTBz7IFEAIQCA",
  "diario-1": "CgkI6tTBz7IFEAIQBQ",
  "diario-7": "CgkI6tTBz7IFEAIQBw",
};

/** Placar "Palavras descobertas": soma das palavras que o jogador já descobriu. */
export const PLAY_LEADERBOARD_WORDS: string = "CgkI6tTBz7IFEAIQDg";
