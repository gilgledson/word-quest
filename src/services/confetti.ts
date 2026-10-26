/**
 * Confete da vitória. A biblioteca só é baixada na primeira vitória, e é ignorada quando as
 * animações estão desligadas ou o sistema pede menos movimento.
 */
const COLORS = ["#ffc933", "#35b3ff", "#63d9a0", "#ff7aa8", "#ffffff"];
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
  } catch {
    /* O confete é só enfeite: sem canvas ou sem rede, a partida segue normal. */
  }
}
