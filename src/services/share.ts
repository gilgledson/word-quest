/**
 * Compartilhar um texto: no app abre a folha de compartilhamento do Android (WhatsApp, mensagens…);
 * no navegador usa a do sistema, quando existe. Sem nenhuma das duas, copia o texto.
 */
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type ShareResult = "shared" | "copied" | "failed";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
export async function shareText(text: string): Promise<ShareResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ text, dialogTitle: "Enviar convite" });
      return "shared";
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // O jogador fechou a folha de compartilhar: não é erro e não há o que copiar.
    return "failed";
  }
  return (await copyText(text)) ? "copied" : "failed";
}
