/**
 * Pedido de avaliação na Play Store (só no app Android), sempre num momento feliz: depois de uma
 * vitória (Aventura, casual, diário ou duelo online) ou ao fechar a janela do baú aberto. Vai para
 * quem já voltou ao jogo em outro dia (gostou) ou já venceu 3 fases da Aventura; no máximo 3 vezes
 * e com 45 dias entre uma e outra. Nunca depois de derrota e sem recompensa nem pergunta antes
 * (regras do Google Play); o Google ainda decide se mostra a janela.
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
/** Dias diferentes em que o jogador jogou para ele já contar como "voltou ao jogo". */
export const REVIEW_MIN_DAYS = 2;
export const REVIEW_MAX_ASKS = 3;
export const REVIEW_GAP_DAYS = 45;
const DAY = 86_400_000;

/**
 * Em quantos dias diferentes o jogador jogou (pelas datas das últimas partidas e o último dia em
 * que pegou a recompensa diária).
 */
export function playDays(p: Player) {
  const days = new Set(p.history.map((g) => g.date.slice(0, 10)));
  if (p.loginReward?.last) days.add(p.loginReward.last.slice(0, 10));
  return days.size;
}

/**
 * Se este é um bom momento para pedir a avaliação: o jogador voltou em outro dia ou já venceu
 * `REVIEW_MIN_WINS` fases da Aventura (`wins`), e os limites de pedidos permitem. Quem chama garante
 * que o momento é feliz (vitória ou baú).
 */
export function shouldAskReview(p: Player, wins: number, now = Date.now()) {
  const asks = p.reviewAsks ?? [];
  if (asks.length >= REVIEW_MAX_ASKS) return false;
  const last = asks.at(-1);
  if (last && now - Date.parse(last) < REVIEW_GAP_DAYS * DAY) return false;
  return playDays(p) >= REVIEW_MIN_DAYS || wins >= REVIEW_MIN_WINS;
}

/**
 * Pede a avaliação se for um bom momento (ver `shouldAskReview`), anotando o pedido. `place` diz de
 * onde veio (medição: win ou chest).
 */
export function askReviewIfGood(
  p: Player,
  wins: number,
  save: (asks: string[]) => void,
  place: "win" | "chest",
  now = Date.now(),
) {
  if (!shouldAskReview(p, wins, now)) return false;
  save([...(p.reviewAsks ?? []), new Date(now).toISOString()]);
  void requestReview(place);
  return true;
}

/** Abre a janela de avaliação do Google Play. No navegador, não faz nada. */
export async function requestReview(place?: "win" | "chest") {
  if (!Capacitor.isNativePlatform()) return;
  track("review_requested", place ? { place } : undefined);
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
