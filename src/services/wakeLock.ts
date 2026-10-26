/**
 * Mantém a tela acesa enquanto o app está visível (Screen Wake Lock API). No APK a MainActivity
 * já faz isso com FLAG_KEEP_SCREEN_ON; aqui cobrimos o navegador/PWA. O bloqueio é liberado pelo
 * sistema quando a aba some, então é pedido de novo ao voltar.
 */
type Sentinel = { release: () => Promise<void> };
export function keepScreenOn() {
  const wakeLock = (
    navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
    }
  ).wakeLock;
  if (!wakeLock) return;
  let lock: Sentinel | null = null;
  const acquire = async () => {
    if (document.visibilityState !== "visible" || lock) return;
    try {
      lock = await wakeLock.request("screen");
      (lock as unknown as EventTarget).addEventListener?.("release", () => {
        lock = null;
      });
    } catch {
      /* Sem permissão ou bateria baixa: o app segue normalmente. */
    }
  };
  document.addEventListener("visibilitychange", () => void acquire());
  void acquire();
}
