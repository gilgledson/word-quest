export interface PuzzleWord {
  id: string;
  clue: string;
  answer: string;
  direction: "horizontal" | "vertical";
  startRow: number;
  startCol: number;
  clueRow: number;
  clueCol: number;
  arrow: "right" | "down";
  icon?: string;
}
export const GRID_COLS = 8;
export const GRID_ROWS = 10;
/** Limites de legibilidade do texto de uma pista numa célula (metade de uma célula dupla = 2 linhas). */
export const CLUE_MAX_CHARS = 18;
export const CLUE_MAX_WORD = 9;
export const CLUE_MAX_BLOCKS = 5;
/** Grades do casual são abertas (só palavras do tema): pelo menos tantas casas de resposta. */
export const CASUAL_MIN_LETTERS = 40;
export type Owner = "p" | "ai";
export type BotLevel = "facil" | "medio" | "dificil";
/** Jeito de jogar do oponente: o cuidadoso acerta mais e joga menos letras; o agressivo arrisca. */
export type BotStyle = "cuidadoso" | "agressivo";
export interface VersusState {
  level: BotLevel;
  turn: Owner;
  /** Seed e contador persistidos: recarregar a página não altera a sequência do bot. */
  seed: string;
  rngCount: number;
  /** Estilo e personagem do oponente desta partida (partidas antigas não têm). */
  style?: BotStyle;
  opponent?: string;
}
export const economy = {
  hint: 20,
  duel: { win: 50, draw: 25, loss: 10 },
  /** Estrelas ganhas ao vencer, conforme a dificuldade do oponente. */
  duelStars: { facil: 1, medio: 2, dificil: 3 },
  letterPoint: 1,
  /** Pontos perdidos por cada letra confirmada no lugar errado (o placar não passa de 0). */
  wrongLetter: 1,
  swap: 10,
  daily: 70,
  /** Baús da tela inicial: um a cada 5 vitórias na campanha; prêmio fixo e crescente, em moedas, na ordem de abertura. */
  chest: [50, 75, 100, 125, 150],
  chestEvery: 5,
  rackStart: 5,
  rackMax: 5,
  swapMax: 5,
};
export interface Puzzle {
  id: string;
  number: number;
  world: string;
  difficulty: string;
  rows: number;
  cols: number;
  words: PuzzleWord[];
}
export interface Tile {
  id: string;
  letter: string;
  /** Casa ocupada pela peça (colocada ou consumida); ausente no banco e na reserva. */
  cell?: string;
}
export interface Session {
  puzzleId: string;
  letters: Record<string, string>;
  locked: string[];
  claimed: boolean;
  tiles: Record<string, Tile>;
  /** Peças ainda não distribuídas (reserva virtual), em ordem de entrega. */
  supply: string[];
  /** Peças disponíveis ao jogador. */
  rack: string[];
  /** Casas com peças colocadas, na ordem da inserção (usado por Remover). */
  history: string[];
  /** Quem confirmou cada casa (casas reveladas por ajuda não têm dono). */
  owners: Record<string, Owner>;
  scores: Record<Owner, number>;
  /** Peças que o oponente tem na mão (sorteadas da reserva); só existe no duelo. */
  botRack: string[];
  versus: VersusState;
}
export type PuzzleCell =
  | { kind: "blocked"; key: string; row: number; col: number }
  | { kind: "clue"; key: string; row: number; col: number; words: PuzzleWord[] }
  | {
      kind: "letter";
      key: string;
      row: number;
      col: number;
      solution: string;
      wordIds: string[];
    };
