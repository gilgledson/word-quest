/**
 * Firebase App Check: prova ao Firebase que quem chama é o jogo de verdade, e não um robô, sem
 * mostrar desafio ao jogador. O login anônimo e o Realtime Database (salas e conteúdo) passam a
 * levar um token de verificação.
 *
 * - App Android: o token vem do plugin nativo `AppCheck` (Play Integrity na versão da loja, provedor
 *   de depuração no build `.teste`). Versões da loja sem o plugin seguem sem token.
 * - Versão web publicada: reCAPTCHA Enterprise invisível (selo escondido; o aviso fica no texto da
 *   página, ver `RecaptchaNotice`).
 * - Localhost e testes: só com `VITE_APPCHECK_DEBUG_TOKEN` (token de depuração cadastrado no console,
 *   num `.env.local`). Sem ele, nada é ligado.
 *
 * Enquanto o bloqueio (enforcement) estiver desligado no console, pedidos sem token continuam
 * passando: o App Check só mede.
 */
import { registerPlugin } from "@capacitor/core";
import type { FirebaseApp } from "firebase/app";
import {
  CustomProvider,
  ReCaptchaEnterpriseProvider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from "firebase/app-check";
import { currentMode } from "./appCheckMode";
import { firebaseConfig } from "./firebaseConfig";

interface AppCheckPlugin {
  getToken(): Promise<{ token: string; expireTimeMillis: number }>;
}
const NativeAppCheck = registerPlugin<AppCheckPlugin>("AppCheck");

let instance: AppCheck | undefined;
let started = false;

/** Liga o App Check neste app do Firebase (uma vez, antes do login e do banco). */
export function startAppCheck(app: FirebaseApp): AppCheck | undefined {
  if (started) return instance;
  started = true;
  const mode = currentMode();
  if (mode === "off") return undefined;
  try {
    if (mode === "debug")
      (
        globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN =
        import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    const provider =
      mode === "native"
        ? new CustomProvider({
            getToken: () => NativeAppCheck.getToken(),
          })
        : mode === "recaptcha"
          ? new ReCaptchaEnterpriseProvider(firebaseConfig.recaptchaSiteKey)
          : // Depuração: o SDK troca o token de depuração e nunca chama este provedor (assim o
            // script do reCAPTCHA nem é baixado no localhost).
            new CustomProvider({
              getToken: () =>
                Promise.reject(new Error("App Check em modo de depuração")),
            });
    instance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    instance = undefined;
  }
  return instance;
}

/**
 * Token atual para pedidos feitos à mão (o `fetch` do conteúdo). `undefined` quando o App Check
 * está desligado ou a verificação falhou: o pedido segue sem token.
 */
export async function appCheckToken(
  app: FirebaseApp,
): Promise<string | undefined> {
  const appCheck = startAppCheck(app);
  if (!appCheck) return undefined;
  try {
    return (await getToken(appCheck)).token;
  } catch {
    return undefined;
  }
}

/** A verificação deste aparelho funciona agora (usado só para explicar um erro ao jogador). */
export async function appCheckWorks(app: FirebaseApp): Promise<boolean> {
  return (await appCheckToken(app)) !== undefined;
}
