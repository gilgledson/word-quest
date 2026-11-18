import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, Share, X } from "lucide-react";
import { track } from "../services/telemetry";

const DISMISS_KEY = "wq-webbar-dismissed";
const PLAY_URL =
  "https://play.google.com/store/apps/details?id=br.com.wordquest.game&referrer=" +
  encodeURIComponent("utm_source=web&utm_medium=faixa");

type Kind = "android" | "ios";
/** Que convite cabe aqui: só na versão web, fora do app instalado na tela de início. */
function kindOf(): Kind | undefined {
  if (Capacitor.isNativePlatform() || typeof navigator === "undefined")
    return undefined;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return undefined;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  // iPadOS se apresenta como Mac: o toque na tela entrega.
  if (
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
    return "ios";
  return undefined;
}
const dismissed = () => {
  try {
    return !!localStorage.getItem(DISMISS_KEY);
  } catch {
    return false;
  }
};

/**
 * Faixa da versão web (jogar.wordquest.com.br). No Android, leva ao app da Play Store; no iPhone,
 * ensina a pôr o jogo na Tela de Início (o Safari pode apagar o progresso de sites pouco usados,
 * mas não o dos apps da tela de início). Some ao fechar e não volta.
 */
export function WebAppBar({ visible }: { visible: boolean }) {
  const [kind] = useState(kindOf);
  const [closed, setClosed] = useState(dismissed);
  if (!visible || !kind || closed) return null;
  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* Sem armazenamento, a faixa volta na próxima visita. */
    }
  };
  return (
    <aside className="web-app-bar" aria-label="WordQuest no celular">
      {kind === "android" ? (
        <a
          className="web-app-bar-main"
          href={PLAY_URL}
          onClick={() => track("web_bar_click", { kind })}
        >
          <Download size={20} aria-hidden="true" />
          <span>
            <b>Baixe o app grátis</b>
            <small>
              Seu progresso salvo e convites que abrem direto no jogo.
            </small>
          </span>
        </a>
      ) : (
        <p className="web-app-bar-main">
          <Share size={20} aria-hidden="true" />
          <span>
            <b>Guarde o jogo na Tela de Início</b>
            <small>
              Toque em Compartilhar e depois em “Adicionar à Tela de Início”
              para não perder seu progresso.
            </small>
          </span>
        </p>
      )}
      <button
        type="button"
        className="web-app-bar-close"
        aria-label="Fechar aviso"
        onClick={close}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
