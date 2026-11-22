/**
 * Qual verificação do App Check vale aqui (ver `appCheck.ts`). Fica separado para o resto do jogo
 * decidir sem baixar o SDK do Firebase.
 */
import { Capacitor } from "@capacitor/core";
import { firebaseConfig } from "./firebaseConfig";

export type AppCheckMode = "native" | "recaptcha" | "debug" | "off";

/** Endereços da versão web publicada (o reCAPTCHA só vale neles). */
const PUBLISHED_WEB =
  /(^|\.)wordquest\.com\.br$|^wordquest-online\.(web\.app|firebaseapp\.com)$/;

/** Qual verificação usar neste lugar. Pura, para os testes. */
export function appCheckMode(env: {
  native: boolean;
  plugin: boolean;
  host: string;
  siteKey: string;
  debugToken: string;
}): AppCheckMode {
  if (env.native) return env.plugin ? "native" : "off";
  if (env.debugToken) return "debug";
  if (env.siteKey && PUBLISHED_WEB.test(env.host)) return "recaptcha";
  return "off";
}

export const currentMode = (): AppCheckMode =>
  appCheckMode({
    native: Capacitor.isNativePlatform(),
    plugin: Capacitor.isPluginAvailable("AppCheck"),
    host: typeof location === "undefined" ? "" : location.hostname,
    siteKey: firebaseConfig.recaptchaSiteKey,
    debugToken: import.meta.env.VITE_APPCHECK_DEBUG_TOKEN ?? "",
  });
