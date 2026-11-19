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
  /**
   * Pista completa, mostrada no painel da palavra selecionada (até `DICA_MAX_CHARS`). A `clue` é o
   * rótulo curto que cabe na casa da grade; sem `dica`, o painel repete a `clue`.
   */
  dica?: string;
}
export const GRID_COLS = 8;
export const GRID_ROWS = 10;
/**
 * Tamanhos de grade aceitos nas fases da Aventura (colunas×linhas) e o mínimo de palavras de cada um.
 * A grade cresce um passo a cada mundo, até 8×8: Vila 6×6, Floresta 6×7, Deserto 7×7, Reino 7×8 e
 * Ilhas 8×8. A 8×10 (padrão) fica para os temas do Casual e o "Clássico" do duelo. Grade menor =
 * casas maiores e partidas mais curtas. `gridSpec` acha o tamanho.
 */
export const LEVEL_GRIDS = [
  { cols: GRID_COLS, rows: GRID_ROWS, minWords: 20 },
  { cols: 6, rows: 6, minWords: 8 },
  { cols: 6, rows: 7, minWords: 9 },
  { cols: 7, rows: 7, minWords: 10 },
  { cols: 7, rows: 8, minWords: 12 },
  { cols: 8, rows: 8, minWords: 14 },
] as const;
export const gridSpec = (p: { rows: number; cols: number }) =>
  LEVEL_GRIDS.find((g) => g.rows === p.rows && g.cols === p.cols);
/** Limites de legibilidade do texto de uma pista numa célula (metade de uma célula dupla = 2 linhas). */
export const CLUE_MAX_CHARS = 18;
export const CLUE_MAX_WORD = 9;
export const CLUE_MAX_BLOCKS = 5;
/** Pista completa (painel): cabe em duas linhas do painel num celular estreito. */
export const DICA_MAX_CHARS = 70;
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
  /**
   * Duelo curto: termina quando o oponente fecha esta rodada (cada um jogou `rounds` vezes), mesmo
   * com a grade aberta. O primeiro duelo do jogador novo e as fases 2 a 4 têm (`campaignRounds`);
   * sem o campo, vale a grade inteira.
   */
  rounds?: number;
}
export const economy = {
  hint: 20,
  /** Moedas ao fim do duelo: vencer e empatar pagam; perder tira (o saldo não fica negativo). */
  duel: { win: 50, draw: 25, loss: -10 },
  /**
   * Estrelas ao vencer, pela parte dos pontos do duelo que foi do jogador: vencer dá 1; com pelo
   * menos `starShare[0]` dos pontos, 2; com `starShare[1]`, 3.
   */
  starShare: [0.6, 0.75] as const,
  letterPoint: 1,
  /** Pontos perdidos por cada letra confirmada no lugar errado (o placar não passa de 0). */
  wrongLetter: 1,
  /** Preço de cada peça trocada, na ordem: a terceira custa mais, para a troca não virar sorteio da mão toda. */
  swap: [10, 10, 15],
  daily: 70,
  /** Moedas para quem criou a sala quando um amigo novo termina um duelo ao vivo com ele (até `inviteMax` amigos). */
  invite: 30,
  inviteMax: 5,
  /** Baús da tela inicial: um a cada 25 palavras descobertas (sem repetir fases); prêmio crescente, em moedas, na ordem de abertura (o último vale para os seguintes). */
  chest: [50, 75, 100, 125, 150],
  chestWords: 25,
  rackStart: 5,
  rackMax: 5,
  /** Peças por troca; e só uma troca por vez do jogador. */
  swapMax: 3,
  /** O curinga chega ao banco depois de tantas jogadas do oponente (uma peça por partida). */
  jokerAfter: 2,
  /** Rodadas do primeiro duelo (fase 1 com o tutorial): curto, para a primeira vitória vir em poucos minutos. */
  firstDuelRounds: 6,
  /**
   * Curva do começo da Aventura (como nos jogos de fase): as fases 2 e 3 são duelos curtos contra
   * rival fácil, com a mão sempre fechando uma palavra; a 4 é a primeira média (rival médio, sem
   * ajuda, um pouco mais longa). A fase 1 é curta só no tutorial. Da 5 em diante, a grade inteira.
   */
  campaignRounds: { 2: 8, 3: 10, 4: 12 } as Record<number, number>,
};
/** Estrelas de uma vitória (0 se não venceu), pela parte dos pontos que o jogador fez. */
export function duelStars(scores: Record<Owner, number>) {
  const { p, ai } = scores;
  if (p <= ai) return 0;
  const share = p / (p + ai);
  return share >= economy.starShare[1]
    ? 3
    : share >= economy.starShare[0]
      ? 2
      : 1;
}
/** Custo total de trocar `count` peças de uma vez. */
export const swapPrice = (count: number) =>
  economy.swap.slice(0, count).reduce((sum, price) => sum + price, 0);
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
  /** Curinga: vale "?" até ser usado; entra numa casa como peça pendente (movível) e só vira a letra certa dela ao confirmar. */
  joker?: boolean;
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
  /** Quem confirmou cada casa. */
  owners: Record<string, Owner>;
  /** Casas travadas pela Dica (pontuam para o jogador, mas contam como ajuda). */
  hinted?: string[];
  scores: Record<Owner, number>;
  /** Letras que o jogador confirmou no lugar errado nesta partida. */
  misses?: number;
  /** O jogador já trocou letras nesta vez (uma troca por vez; volta a valer ao confirmar). */
  swapped?: boolean;
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
