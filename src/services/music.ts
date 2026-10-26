/**
 * Música de fundo ("Where the River Bends"): toca em loop enquanto o app está visível e a opção
 * Música está ligada. Navegadores e o WebView do Android só liberam o som depois de um toque,
 * então o primeiro toque do jogador chama `resumeMusic`.
 */
export const MUSIC_SRC = "/audio/where-the-river-bends.mp3";
const VOLUME = 0.35;
let audio: HTMLAudioElement | null = null;
let wanted = false;
const element = () => {
  if (!audio && typeof Audio !== "undefined") {
    audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";
  }
  return audio;
};
const play = () => {
  const a = element();
  if (!a || !wanted || document.visibilityState !== "visible") return;
  try {
    void a.play()?.catch(() => {
      /* Bloqueado até o primeiro toque; resumeMusic tenta de novo. */
    });
  } catch {
    /* A música é opcional. */
  }
};
export function setMusic(on: boolean) {
  wanted = on;
  if (on) play();
  else audio?.pause();
}
/** Chamado a cada toque: retoma a música se ela devia estar tocando e está parada. */
export function resumeMusic() {
  if (wanted && audio?.paused !== false) play();
}
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") play();
    else audio?.pause();
  });
