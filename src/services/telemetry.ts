/**
 * Medição de uso (Firebase Analytics) e relatório de falhas (Crashlytics), só no app Android. No
 * navegador nada é chamado. Os eventos são poucos e sem dado pessoal: dizem o que aconteceu no jogo
 * (tela aberta, partida iniciada ou terminada), nunca quem é o jogador nem o que ele digitou.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { consumeLangChange, deviceLanguage, lang, langOrigin } from "../i18n";

type Params = Record<string, string | number | boolean>;
interface TelemetryPlugin {
  logEvent(options: { name: string; params?: Params }): Promise<void>;
  recordError(options: { message: string; stack?: string }): Promise<void>;
  setContext(options: { key: string; value: string }): Promise<void>;
  /** Só nas versões da loja a partir da 5.8; nas anteriores a chamada falha e é ignorada. */
  setUserProperty(options: { name: string; value: string }): Promise<void>;
}
const Telemetry = registerPlugin<TelemetryPlugin>("Telemetry");
const native = () => Capacitor.isNativePlatform();
/** Versão web publicada (jogar.wordquest.com.br): mede também; localhost e testes, nunca. */
const publishedWeb = () =>
  !native() &&
  typeof location !== "undefined" &&
  /(^|\.)wordquest\.com\.br$/.test(location.hostname);
type Logger = ((name: string, params: Params) => void) & {
  setUser?: (props: Record<string, string>) => void;
};
let web: Promise<Logger | undefined> | undefined;
const webLogger = () =>
  (web ??= import("./webAnalytics")
    .then((m) => m.startWebAnalytics())
    .catch(() => undefined));

/**
 * Registra um evento do jogo. Falha de rede ou de plugin nunca chega ao jogador. Todo evento leva o
 * idioma do jogo (`lang`: pt ou en), para comparar o funil de cada público.
 */
export function track(name: string, eventParams: Params = {}) {
  const params: Params = { ...eventParams, lang: lang() };
  if (native()) {
    void Telemetry.logEvent({ name, params }).catch(() => {});
    return;
  }
  if (publishedWeb())
    void webLogger().then((log) => {
      try {
        log?.(name, params);
      } catch {
        /* Medição é opcional. */
      }
    });
}

/** Propriedade de usuário no Analytics (ex.: `lang`), para filtrar públicos em qualquer relatório. */
export function setUserProperty(name: string, value: string) {
  if (native()) {
    void Telemetry.setUserProperty({ name, value }).catch(() => {});
    return;
  }
  if (publishedWeb())
    void webLogger().then((log) => {
      try {
        log?.setUser?.({ [name]: value });
      } catch {
        /* Medição é opcional. */
      }
    });
}

/**
 * Idioma na abertura do app: vira propriedade de usuário e gera um evento quando muda.
 * - `language_changed` (from, to): o jogador trocou nas Configurações (medido na abertura seguinte);
 * - `language_detected` (device_lang): primeira abertura com idioma, escolhido pelo aparelho.
 */
export function trackLanguage() {
  const l = lang();
  setUserProperty("lang", l);
  const from = consumeLangChange();
  if (from) track("language_changed", { from, to: l });
  else if (langOrigin() === "device")
    track("language_detected", { device_lang: deviceLanguage() });
}

/** Nome da tela a partir da rota, sem o que identifica a partida (código da sala, número da grade). */
export function screenOf(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/map")) return "mapa";
  if (pathname === "/casual") return "casual";
  if (pathname === "/daily") return "diario";
  if (pathname === "/profile") return "perfil";
  if (pathname === "/credits") return "creditos";
  if (pathname === "/loja") return "loja";
  if (pathname === "/liga") return "liga";
  if (pathname === "/online") return "online_lobby";
  if (pathname === "/online/nova") return "online_configurar";
  if (pathname.startsWith("/online/")) return "partida_online";
  if (pathname === "/play/daily") return "partida_diario";
  if (pathname.startsWith("/play/casual-")) return "partida_casual";
  if (pathname.startsWith("/play/")) return "partida_aventura";
  return "outra";
}
/**
 * O app terminou de carregar e mostrou a primeira tela. Comparado com `first_open` e
 * `session_start`, diz quantas aberturas morrem no carregamento e quanto ele demora.
 */
export function trackAppReady(bundle: string) {
  track("app_ready", {
    load_ms: Math.round(performance.now()),
    bundle,
  });
}
/** Tela aberta: vira `screen_view` no Analytics e contexto do próximo relatório de falha. */
export function trackScreen(pathname: string) {
  const name = screenOf(pathname);
  track("screen_view", { screen_name: name, screen_class: "WordQuest" });
  if (!native()) return;
  void Telemetry.setContext({ key: "tela", value: name }).catch(() => {});
}

/** Tamanho máximo do texto de erro enviado (o Crashlytics corta entradas longas). */
const ERROR_MAX = 1500;
/** Envia ao Crashlytics um erro de JavaScript que o jogo capturou. */
export function reportError(error: unknown) {
  if (!native()) return;
  const e = error instanceof Error ? error : new Error(String(error));
  void Telemetry.recordError({
    message: `${e.name}: ${e.message}`.slice(0, 300),
    stack: (e.stack ?? "").slice(0, ERROR_MAX),
  }).catch(() => {});
}
/** Passa a relatar os erros que escapam do React: exceções soltas e promessas rejeitadas. */
export function installErrorReporting() {
  if (!native()) return;
  void Telemetry.setContext({ key: "idioma", value: lang() }).catch(() => {});
  window.addEventListener("error", (event) =>
    reportError(event.error ?? event.message),
  );
  window.addEventListener("unhandledrejection", (event) =>
    reportError(event.reason),
  );
}
