/**
 * Atualização ao vivo do app (só no Android): o código e a arte do jogo vêm do nosso Firebase
 * Hosting sem passar pela Play Store. O app sempre abre a versão que já tem (funciona offline);
 * em segundo plano confere se há pacote novo para esta versão nativa, baixa só os arquivos que
 * mudaram e o põe em uso na próxima abertura. Se a versão nova não abrir direito em 10 s, o
 * plugin volta sozinho para a anterior.
 *
 * Publicação: scripts/publish-app.mjs (gera o pacote, a lista de arquivos e `latest.json`).
 */
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { reportError, track } from "./telemetry";

export const LIVE_UPDATE_URL =
  "https://wordquest-online.web.app/app/latest.json";

export interface LiveRelease {
  /** Versão do pacote (ex.: "5.3.20261116-1930"). */
  version: string;
  /** Versões nativas (versionName da loja) em que o pacote funciona. */
  natives: string[];
  /** Pacote inteiro (zip), usado se a lista de arquivos não servir. */
  url: string;
  /** Arquivos do pacote: o plugin baixa só os que não tem iguais (pelo sha256). */
  manifest: { file_name: string; file_hash: string; download_url: string }[];
}

/** Data de um pacote ("5.3.20261117-1200" → "20261117-1200"). */
export const stampOf = (version: string) => version.split(".").pop() ?? "";

/**
 * Este pacote pode ser instalado aqui? Precisa servir para esta versão nativa e ser mais novo que
 * o que está em uso: o app da loja traz o próprio código (o "builtin", com a data do build), e um
 * pacote ao vivo publicado antes dele não pode substituí-lo.
 */
export function applies(
  release: LiveRelease | null,
  current: { version: string; native: string; builtStamp: string },
) {
  if (
    !release ||
    typeof release.version !== "string" ||
    !Array.isArray(release.natives) ||
    !Array.isArray(release.manifest) ||
    !release.natives.includes(current.native)
  )
    return false;
  const inUse =
    current.version === "builtin"
      ? current.builtStamp
      : stampOf(current.version);
  return stampOf(release.version) > inUse;
}

/** Abertura do app: a versão em uso abriu bem (senão o plugin a desfaz). */
export async function confirmBundle() {
  if (!Capacitor.isNativePlatform()) return;
  await CapacitorUpdater.notifyAppReady().catch(() => {});
}

export type LiveUpdateResult =
  "web" | "current" | "ready" | "offline" | "failed";
/** Confere o servidor e deixa a versão nova pronta para a próxima abertura. */
export async function checkLiveUpdate(
  fetcher: typeof fetch = fetch,
): Promise<LiveUpdateResult> {
  if (!Capacitor.isNativePlatform()) return "web";
  let release: LiveRelease | null;
  try {
    const res = await fetcher(LIVE_UPDATE_URL, { cache: "no-store" });
    if (!res.ok) return "offline";
    release = (await res.json()) as LiveRelease;
  } catch {
    return "offline";
  }
  try {
    const { bundle, native } = await CapacitorUpdater.current();
    if (
      !applies(release, {
        version: bundle.version,
        native,
        builtStamp: __BUILD_STAMP__,
      })
    )
      return "current";
    const next = await CapacitorUpdater.download({
      url: release!.url,
      version: release!.version,
      manifest: release!.manifest,
    });
    await CapacitorUpdater.next({ id: next.id });
    track("live_update_ready", { version: release!.version });
    return "ready";
  } catch (error) {
    reportError(error);
    return "failed";
  }
}

/** Versão do pacote web em uso (para diagnóstico e telemetria). */
export const bundleVersion = () => __BUNDLE_VERSION__;

/** "Versão 5.3 · pacote 5.3.20261117-1200" (no navegador, só o pacote). */
export async function appVersion() {
  const pack = bundleVersion() === "builtin" ? "do app" : bundleVersion();
  if (!Capacitor.isNativePlatform()) return `Versão web · pacote ${pack}`;
  try {
    const { native } = await CapacitorUpdater.current();
    return `Versão ${native} · pacote ${pack}`;
  } catch {
    return `Pacote ${pack}`;
  }
}
