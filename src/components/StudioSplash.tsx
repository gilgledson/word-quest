import { useEffect, useRef, useState } from "react";

/** Quanto cada etapa fica na tela (ms). A dos estúdio some antes se o jogador tocar. */
export const STUDIO_MS = 1500;
export const GAME_MIN_MS = 900;
const FADE_MS = 300;
let shown = false; // a abertura aparece só uma vez por abertura do app

/** Navegadores automatizados (testes) pulam a abertura, a menos que a URL peça `?splash=1`. */
const skipped = () =>
  typeof navigator !== "undefined" &&
  navigator.webdriver &&
  !new URLSearchParams(window.location.search).has("splash");

type Phase = "studio" | "game" | "leaving" | "done";

/**
 * Abertura do app: primeiro a marca do estúdio (fundo preto), depois a tela do jogo até o progresso
 * carregar. Um toque pula a etapa. Fica por cima de tudo e some com um fade.
 */
export function StudioSplash({ ready }: { ready: boolean }) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (shown || skipped()) return "done";
    shown = true;
    return "studio";
  });
  const gameSince = useRef(0);
  useEffect(() => {
    if (phase !== "studio") return;
    const t = setTimeout(() => setPhase("game"), STUDIO_MS);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== "game") return;
    gameSince.current = gameSince.current || Date.now();
    if (!ready) return;
    const wait = Math.max(0, GAME_MIN_MS - (Date.now() - gameSince.current));
    const t = setTimeout(() => setPhase("leaving"), wait);
    return () => clearTimeout(t);
  }, [phase, ready]);
  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);
  if (phase === "done") return null;
  const skip = () => {
    if (phase === "studio") setPhase("game");
    else if (phase === "game" && ready) setPhase("leaving");
  };
  return (
    <div
      className={`studio-splash ${phase}`}
      role="status"
      aria-label="Abrindo WordQuest, um jogo da Lunara Games"
      onClick={skip}
    >
      <div className="splash-game" aria-hidden="true">
        <img className="splash-village" src="/art/splash-vila-v2.webp" alt="" />
        <img className="splash-emblem" src="/icon-512.png" alt="" />
        <img className="splash-logo" src="/art/wordquest-logo-v1.webp" alt="" />
      </div>
      <div
        className={`splash-studio ${phase === "studio" ? "on" : ""}`}
        aria-hidden="true"
      >
        <img src="/art/studio-lunara.webp" alt="" />
      </div>
    </div>
  );
}
