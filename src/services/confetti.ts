/**
 * Confete da vitória. A biblioteca só é baixada na primeira vitória, e é ignorada quando as
 * animações estão desligadas ou o sistema pede menos movimento.
 */
const COLORS = ["#ffc933", "#35b3ff", "#63d9a0", "#ff7aa8", "#ffffff"];
/** Tempo máximo do confete na tela (a animação normal dura ~4 s). */
export const CONFETTI_MAX_MS = 4500;
export async function celebrate(animations: boolean) {
  if (!animations) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    const base = {
      colors: COLORS,
      disableForReducedMotion: true,
      zIndex: 1000,
      ticks: 220,
    };
    void confetti({
      ...base,
      particleCount: 90,
      spread: 80,
      origin: { x: 0.5, y: 0.65 },
    });
    setTimeout(() => {
      void confetti({
        ...base,
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
      });
      void confetti({
        ...base,
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
      });
    }, 250);
    // Encerra à força: em celulares com pouca memória de vídeo o canvas do confete não consegue
    // ser desenhado, a animação cai para ~2 quadros por segundo e o canvas de tela inteira ficava
    // por cima de todas as telas por minutos, piscando em branco (moto g14, 27/11/2026).
    setTimeout(() => confetti.reset?.(), CONFETTI_MAX_MS);
  } catch {
    /* O confete é só enfeite: sem canvas ou sem rede, a partida segue normal. */
  }
}
