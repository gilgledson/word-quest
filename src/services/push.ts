/**
 * Notificações do duelo por turnos ("Fulano jogou! É sua vez"). Só no app Android a partir da
 * versão 6.0 (com o plugin de push); nas versões antigas e na web nada acontece. As mensagens saem
 * das Cloud Functions (functions/index.js) para o token que este aparelho grava em `push/<uid>`.
 *
 * A permissão é pedida na hora em que faz sentido (o jogador entrou num duelo por turnos), não ao
 * abrir o jogo. Com ela já dada, o token é regravado a cada abertura (ele muda de vez em quando).
 */
import { Capacitor } from "@capacitor/core";
import { lang } from "../i18n";
import { onlineText as T } from "../i18n/online";
import { onlineBackend } from "./online";
import { track } from "./telemetry";

export const pushSupported = () =>
  Capacitor.isNativePlatform() &&
  Capacitor.isPluginAvailable("PushNotifications");

const plugin = () => import("@capacitor/push-notifications");
let registered: Promise<void> | undefined;

/**
 * Liga os avisos do duelo neste aparelho: com `ask`, pede a permissão se ainda não foi decidida;
 * sem ela, só renova o token de quem já deu a permissão. Uma vez por abertura do jogo.
 */
export function enableDuelPush({ ask }: { ask: boolean }) {
  if (!pushSupported()) return Promise.resolve();
  if (registered) return registered;
  const run = (async () => {
    const { PushNotifications } = await plugin();
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive.startsWith("prompt")) {
      if (!ask) throw new Error("sem permissão ainda");
      track("push_permission_asked");
      perm = await PushNotifications.requestPermissions();
      track("push_permission", { granted: perm.receive === "granted" });
    }
    if (perm.receive !== "granted") return;
    await PushNotifications.createChannel({
      id: "duelo",
      name: T.pushChannel,
      description: T.pushChannelText,
      importance: 4,
    }).catch(() => {});
    await PushNotifications.addListener("registration", ({ value }) => {
      void onlineBackend()
        .then((b) => b.savePushToken(value, lang()))
        .catch(() => {});
    });
    await PushNotifications.register();
  })();
  // Sem permissão ainda (ou falhou): pode tentar de novo depois, quando for a hora de pedir.
  registered = run.catch(() => {
    registered = undefined;
  });
  return registered;
}

/** Tocar no aviso abre a partida (ou o lobby do duelo). */
export function followPushTaps(go: (route: string) => void) {
  if (!pushSupported()) return () => {};
  let stop: (() => void) | undefined;
  void plugin()
    .then(({ PushNotifications }) =>
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        ({ notification }) => {
          const data = (notification.data ?? {}) as Record<string, string>;
          track("push_opened", { kind: data.kind ?? "?" });
          go(data.route?.startsWith("/online") ? data.route : "/online");
        },
      ),
    )
    .then((h) => (stop = () => void h.remove()))
    .catch(() => {});
  return () => stop?.();
}
