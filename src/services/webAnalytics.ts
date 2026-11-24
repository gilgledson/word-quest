/**
 * Analytics da versão web (jogar.wordquest.com.br), carregado só quando o jogo roda no navegador
 * nesse endereço. Mesma regra do app Android: sem sinais para anúncios nem personalização, e os
 * mesmos eventos (telas e o que acontece no jogo, nunca quem é o jogador).
 */
import {
  initializeAnalytics,
  isSupported,
  logEvent,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";
import { firebaseApp } from "./firebaseApp";

type Params = Record<string, string | number | boolean>;

export async function startWebAnalytics() {
  if (!(await isSupported())) return undefined;
  const analytics: Analytics = initializeAnalytics(firebaseApp(), {
    config: {
      // As telas vão como `screen_view`, como no app (sem o page_view automático duplicado).
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  });
  const log = (name: string, params: Params) =>
    logEvent(analytics, name, params as Record<string, unknown>);
  /** Propriedade de usuário (ex.: `lang`), para segmentar os relatórios por público. */
  log.setUser = (props: Record<string, string>) =>
    setUserProperties(analytics, props);
  return log;
}
