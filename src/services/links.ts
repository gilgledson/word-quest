/**
 * Links do jogo: https://wordquest.com.br/c/CODIGO abre a sala do duelo ao vivo.
 *
 * - Com o jogo instalado (versão com o filtro de links), o Android abre o app direto no link.
 * - Sem o jogo, o link abre a página do convite, que leva à Play Store com `sala=CODIGO` no
 *   referrer; na primeira abertura depois de instalar, o app lê esse referrer e entra na sala.
 */
import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import { track } from "./telemetry";

interface LinksPlugin {
  launchUrl(): Promise<{ url?: string }>;
  installReferrer(): Promise<{ referrer?: string; installedAt?: number }>;
  addListener(
    event: "link",
    fn: (data: { url: string }) => void,
  ): Promise<PluginListenerHandle>;
}
const Links = registerPlugin<LinksPlugin>("Links");

/** Mesmo formato de `CODE_CHARS`/`CODE_LENGTH` (game/online), sem puxar o motor para a abertura. */
const CODE = /^[A-Z0-9]{6}$/;
const HOST = /^(www\.)?wordquest\.com\.br$/i;
/** O referrer só vale logo depois da instalação (ele fica guardado para sempre na Play). */
const REFERRER_MAX_AGE_S = 2 * 86_400;
const REFERRER_KEY = "wq-referrer-checked";

const roomRoute = (raw: string | null | undefined) => {
  const code = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE.test(code) ? `/online/${code}` : undefined;
};

/** Rota do jogo para um link do site (`/c/CODIGO` → sala; outro caminho do site → início). */
export function routeOfLink(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!HOST.test(u.hostname)) return undefined;
    const m = u.pathname.match(/^\/c\/([^/]+)/);
    if (!m) return "/";
    return roomRoute(decodeURIComponent(m[1])) ?? "/online";
  } catch {
    return undefined;
  }
}

/** Sala que veio no link de instalação da Play Store (`sala=CODIGO`). */
export function routeOfReferrer(referrer: string | undefined) {
  if (!referrer) return undefined;
  return roomRoute(new URLSearchParams(referrer).get("sala"));
}

const once = () => {
  try {
    if (localStorage.getItem(REFERRER_KEY)) return false;
    localStorage.setItem(REFERRER_KEY, "1");
    return true;
  } catch {
    return false;
  }
};

/**
 * Passa a seguir os links: o que abriu o app, os tocados com ele aberto e, na primeira abertura
 * depois da instalação, o convite que levou à Play Store. Devolve a função que para de ouvir.
 */
export function followLinks(go: (route: string) => void) {
  // Versões da loja anteriores à 5.4 não têm o plugin (podem receber este código pela
  // atualização ao vivo): nelas os links seguem abrindo o site, como antes.
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("Links"))
    return () => {};
  let handle: PluginListenerHandle | undefined;
  let stopped = false;
  void Links.addListener("link", ({ url }) => {
    const route = routeOfLink(url);
    if (!route) return;
    track("link_opened", { via: "link", room: route.startsWith("/online/") });
    go(route);
  }).then((h) => {
    if (stopped) void h.remove();
    else handle = h;
  });
  void (async () => {
    const { url } = await Links.launchUrl().catch(() => ({ url: undefined }));
    const route = url ? routeOfLink(url) : undefined;
    if (route) {
      track("link_opened", { via: "link", room: route.startsWith("/online/") });
      go(route);
      return;
    }
    if (!once()) return;
    const { referrer, installedAt } = await Links.installReferrer().catch(
      () => ({}) as { referrer?: string; installedAt?: number },
    );
    const room = routeOfReferrer(referrer);
    const fresh =
      !!installedAt && Date.now() / 1000 - installedAt < REFERRER_MAX_AGE_S;
    if (room && fresh && !stopped) {
      track("link_opened", { via: "install", room: true });
      go(room);
    }
  })();
  return () => {
    stopped = true;
    void handle?.remove();
  };
}
