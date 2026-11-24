import type { Player } from "../services/repository";
import { gameText } from "../i18n/game";

/** Itens da loja: comprados com moedas, guardados no inventário e usados na vez do jogador. */
export type ItemId = "curinga" | "vogal";
export interface ShopItem {
  id: ItemId;
  nome: string;
  texto: string;
  /** Frase curta para o card da loja. */
  resumo: string;
  /** Preço do pacote, em moedas. */
  preco: number;
  /** Usos que o pacote rende. */
  usos: number;
}
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "curinga",
    get nome() {
      return gameText.shop.curinga.nome;
    },
    get texto() {
      return gameText.shop.curinga.texto;
    },
    get resumo() {
      return gameText.shop.curinga.resumo;
    },
    preco: 60,
    usos: 1,
  },
  {
    id: "vogal",
    get nome() {
      return gameText.shop.vogal.nome;
    },
    get texto() {
      return gameText.shop.vogal.texto;
    },
    get resumo() {
      return gameText.shop.vogal.resumo;
    },
    preco: 40,
    usos: 5,
  },
];
export const VOWELS = ["A", "E", "I", "O", "U"];

export const itemCount = (p: Player, id: ItemId) => p.items?.[id] ?? 0;

/** Compra um pacote: paga e soma os usos. Sem moedas suficientes, nada muda. */
export function buyItem(p: Player, id: ItemId): Player {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item || p.coins < item.preco) return p;
  return {
    ...p,
    coins: p.coins - item.preco,
    items: { ...p.items, [id]: itemCount(p, id) + item.usos },
  };
}

/** Gasta um uso do item (depois de ele ter funcionado na partida). */
export const spendItem = (p: Player, id: ItemId): Player =>
  itemCount(p, id) > 0
    ? { ...p, items: { ...p.items, [id]: itemCount(p, id) - 1 } }
    : p;
