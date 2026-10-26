/**
 * Vibração do jogo (Capacitor Haptics; no navegador cai em navigator.vibrate). Cada efeito sonoro
 * tem uma vibração parceira: leve ao mexer nas peças, firme ao acertar, dupla ao errar.
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import type { EffectName } from "./sound";

type Buzz = { impact: ImpactStyle } | { notification: NotificationType } | null;

export const BUZZ: Record<EffectName, Buzz> = {
  place: { impact: ImpactStyle.Light },
  replace: { impact: ImpactStyle.Light },
  remove: { impact: ImpactStyle.Light },
  correct: { impact: ImpactStyle.Medium },
  word: { notification: NotificationType.Success },
  wrong: { notification: NotificationType.Warning },
  pass: { impact: ImpactStyle.Light },
  hint: { impact: ImpactStyle.Light },
  swap: { impact: ImpactStyle.Light },
  buy: { impact: ImpactStyle.Light },
  error: { notification: NotificationType.Warning },
  botMove: { impact: ImpactStyle.Light },
  botPass: null,
  win: { notification: NotificationType.Success },
  draw: { impact: ImpactStyle.Medium },
  lose: { notification: NotificationType.Error },
};

export function buzz(enabled: boolean, name: EffectName) {
  const kind = enabled ? BUZZ[name] : null;
  if (!kind) return;
  try {
    const run =
      "impact" in kind
        ? Haptics.impact({ style: kind.impact })
        : Haptics.notification({ type: kind.notification });
    void run.catch(() => {
      /* Aparelho sem vibrador: segue sem vibrar. */
    });
  } catch {
    /* A vibração é opcional. */
  }
}
