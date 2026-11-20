/**
 * Pedido de avaliação na Play Store (só no app Android). O pedido sai depois de uma vitória na
 * Aventura, a partir da 3ª fase vencida, no máximo 3 vezes e com 45 dias entre uma e outra; o
 * Google ainda decide se mostra a janela.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Player } from "./repository";
import { track } from "./telemetry";

interface ReviewPlugin {
  requestReview(): Promise<void>;
}
const Review = registerPlugin<ReviewPlugin>("Review");
const STORE_ID = "br.com.wordquest.game";

export const REVIEW_MIN_WINS = 3;
export const REVIEW_MAX_ASKS = 3;
export const REVIEW_GAP_DAYS = 45;
const DAY = 86_400_000;

/** Se este é um bom momento para pedir a avaliação (pela contagem de vitórias e pedidos anteriores). */
export function shouldAskReview(p: Player, wins: number, now = Date.now()) {
  const asks = p.reviewAsks ?? [];
  if (wins < REVIEW_MIN_WINS || asks.length >= REVIEW_MAX_ASKS) return false;
  const last = asks.at(-1);
  return !last || now - Date.parse(last) >= REVIEW_GAP_DAYS * DAY;
}

/** Abre a janela de avaliação do Google Play. No navegador, não faz nada. */
export async function requestReview() {
  if (!Capacitor.isNativePlatform()) return;
  track("review_requested");
  await Review.requestReview().catch(() => {});
}

/** Botão "Avaliar o jogo" nos Ajustes: só no app instalado (no navegador não há o que avaliar). */
export const canRateInStore = () => Capacitor.isNativePlatform();

/**
 * Abre a página do jogo na Play Store para a pessoa dar a nota quando quiser. A janela de dentro do
 * app não serve aqui: o Google pede que ela não venha de um botão (tem cota e pode não aparecer).
 */
export function openStoreRating(
  open = (url: string) => window.open(url, "_blank"),
) {
  track("review_store_opened");
  open(`market://details?id=${STORE_ID}`);
}
