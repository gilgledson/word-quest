/**
 * Tabuleiros à venda (temas de mesa): mudam a moldura em volta da grade, o cenário de fundo da
 * partida e as cores da grade. Mockup: docs/referencias/cosmeticos/temas-mesa-chatgpt.png; plano:
 * docs/planos/tabuleiros-a-venda.md. A arte da moldura de cada tema (centro e fundo transparentes,
 * esticada pelas bordas) fica em public/art/tabuleiros/temas/<id>.webp.
 */
import type { Player } from "../services/repository";

export const BOARD_IDS = ["vila", "floresta", "deserto", "reino"] as const;
export type BoardId = (typeof BOARD_IDS)[number];

/** Preço de cada tabuleiro em moedas (os do mockup). */
export const BOARD_PRICES: Record<BoardId, number> = {
  vila: 300,
  floresta: 450,
  deserto: 600,
  reino: 800,
};

/** Cenário de fundo da partida com o tema (a Vila usa o cenário de sempre). */
export const BOARD_SCENERY: Record<BoardId, string | undefined> = {
  vila: undefined,
  floresta: "/art/mundos/floresta.webp",
  deserto: "/art/mundos/deserto.webp",
  reino: "/art/mundos/reino.webp",
};

export const isBoardId = (v: unknown): v is BoardId =>
  typeof v === "string" && (BOARD_IDS as readonly string[]).includes(v);

/**
 * Quanto a moldura avança para fora da grade, em px, de cada lado (a grade encolhe isso para caber).
 * Vale com a arte desenhada a BOARD_FRAME_ART px por canto (ver .board-frame-art no board.css).
 */
export const BOARD_FRAME_INSET = 22;

/** Arte da moldura do tabuleiro (esticada pelas bordas em volta da grade). */
export const boardArt = (id: BoardId) => `/art/tabuleiros/temas/${id}.webp`;

/** Tabuleiros que o jogador já tem. */
export const ownedBoards = (p: Pick<Player, "boards">): BoardId[] =>
  (p.boards ?? []).filter(isBoardId);

export const ownsBoard = (p: Pick<Player, "boards">, id: BoardId) =>
  ownedBoards(p).includes(id);

/** Tabuleiro em uso (só vale se o jogador o tem); sem tema, o tabuleiro de sempre. */
export const currentBoard = (
  p: Pick<Player, "board" | "boards">,
): BoardId | undefined =>
  isBoardId(p.board) && ownsBoard(p, p.board) ? p.board : undefined;

/** Compra o tabuleiro e já passa a usá-lo. Sem moedas ou já comprado, nada muda. */
export function buyBoard(p: Player, id: BoardId): Player {
  const price = BOARD_PRICES[id];
  if (ownsBoard(p, id) || p.coins < price) return p;
  return {
    ...p,
    coins: p.coins - price,
    boards: [...ownedBoards(p), id],
    board: id,
  };
}

/** Passa a usar um tabuleiro que já tem (ou o de sempre, com `undefined`). */
export function wearBoard(p: Player, id: BoardId | undefined): Player {
  if (id && !ownsBoard(p, id)) return p;
  return { ...p, board: id };
}
