/**
 * Confete da vitória. A biblioteca só é baixada na primeira vitória, e é ignorada quando as
 * animações estão desligadas ou o sistema pede menos movimento.
 *
 * O canvas é do próprio app, desenhado sem Worker, e sai da página em `CONFETTI_MAX_MS`. No moto
 * g14 (27-28/11/2026), com a memória de vídeo no limite, o canvas padrão da biblioteca (desenhado num
 * Worker, com OffscreenCanvas) não conseguia ser pintado: a animação caía para ~2 quadros por
 * segundo e a tela inteira piscava em branco por minutos, em todas as telas, depois de cada vitória.
 */
const COLORS = ["#ffc933", "#35b3ff", "#63d9a0", "#ff7aa8", "#ffffff"];
/** Tempo máximo do confete na tela (a animação normal dura ~4 s). */
export const CONFETTI_MAX_MS = 4500;

let current:
  | { canvas: HTMLCanvasElement; timer: ReturnType<typeof setTimeout> }
  | undefined;

/** Tira o confete da tela agora (para a animação e remove o canvas). */
export function clearConfetti(reset?: () => void) {
  if (!current) return;
  clearTimeout(current.timer);
  try {
    reset?.();
  } catch {
    /* já parou */
  }
  current.canvas.remove();
  current = undefined;
}

export async function celebrate(animations: boolean) {
  if (!animations) return;
  try {
    const lib = await import("canvas-confetti");
    clearConfetti();
    const canvas = document.createElement("canvas");
    canvas.className = "fx-confetti";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1000",
    });
    document.body.append(canvas);
    const fire = lib.create(canvas, { resize: true, useWorker: false });
    const timer = setTimeout(() => clearConfetti(fire.reset), CONFETTI_MAX_MS);
    current = { canvas, timer };
    const base = {
      colors: COLORS,
      disableForReducedMotion: true,
      ticks: 220,
    };
    void fire({
      ...base,
      particleCount: 90,
      spread: 80,
      origin: { x: 0.5, y: 0.65 },
    });
    setTimeout(() => {
      if (current?.canvas !== canvas) return;
      void fire({
        ...base,
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
      });
      void fire({
        ...base,
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
      });
    }, 250);
  } catch {
    /* O confete é só enfeite: sem canvas ou sem rede, a partida segue normal. */
    clearConfetti();
  }
}
