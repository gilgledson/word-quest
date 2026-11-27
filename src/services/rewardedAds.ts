/**
 * Vídeo premiado (AdMob, só quando o jogador escolhe assistir). No Android usa o plugin
 * `@capacitor-community/admob`: antes de iniciar o SDK pede o consentimento do formulário do Google
 * (UMP), que só aparece onde a lei exige. No navegador de desenvolvimento (localhost) o vídeo é
 * simulado, para testar o fluxo sem anúncio de verdade; na versão web publicada não há vídeo.
 *
 * As moedas entram só no aviso de recompensa do anúncio (vídeo assistido até o fim). Fechar antes
 * não paga nem gasta o limite do dia (ver `game/rewarded`).
 */
import { create } from "zustand";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { today } from "../data/catalog";
import { creditVideo, videosLeft, type RewardedPlace } from "../game/rewarded";
import { usePlayer } from "../stores/player";
import { track } from "./telemetry";
import { rewardedEnabled, rewardedUnit } from "./adsConfig";
import { rewardedT as t } from "../i18n/screens";

export type AdOutcome = { earned: true } | { earned: false; reason: string };

/** Etapa em que o vídeo deixou de ficar disponível (evento `rewarded_unavailable`). */
export type AdStage = "plugin" | "consent" | "init" | "load";

/** Falha com a etapa e o código do SDK (ex.: 3 = sem anúncio para mostrar agora). */
export class AdUnavailable extends Error {
  constructor(
    readonly stage: AdStage,
    readonly code = "",
    message = "",
  ) {
    super(message || stage);
  }
}
/** Etapa e código de um erro qualquer vindo do SDK (sem etapa conhecida, vale `fallback`). */
const unavailable = (e: unknown, fallback: AdStage) => {
  if (e instanceof AdUnavailable) return e;
  const err = (e ?? {}) as { code?: unknown; message?: unknown };
  return new AdUnavailable(
    fallback,
    err.code === undefined ? "" : String(err.code),
    typeof err.message === "string" ? err.message : String(e ?? ""),
  );
};

/** Quem toca o vídeo: o AdMob no Android, a simulação no navegador (e um falso nos testes). */
export interface AdDriver {
  /** Consentimento e início do SDK; `false` (ou `AdUnavailable`) = sem anúncios neste aparelho. */
  setup(): Promise<boolean>;
  /** Carrega um vídeo; `false` (ou `AdUnavailable`) se não veio nenhum. */
  load(): Promise<boolean>;
  /** Mostra o vídeo carregado e diz se o jogador ganhou a recompensa. */
  show(): Promise<AdOutcome>;
}

interface RewardedStore {
  /** Há um vídeo carregado, pronto para tocar. */
  ready: boolean;
  /** Um vídeo está abrindo ou tocando. */
  busy: boolean;
}
export const useRewarded = create<RewardedStore>(() => ({
  ready: false,
  busy: false,
}));

const native = () => Capacitor.isNativePlatform();
/** A simulação vale só no navegador de desenvolvimento, nunca na web publicada. */
const canSimulate = () =>
  !native() &&
  typeof location !== "undefined" &&
  (import.meta.env.DEV ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname));

/** AdMob no Android. Versões antigas do app (sem o plugin) ficam sem vídeo. */
function admobDriver(): AdDriver {
  const plugin = () => import("@capacitor-community/admob");
  const unit = rewardedUnit();
  return {
    async setup() {
      if (!Capacitor.isPluginAvailable("AdMob"))
        throw new AdUnavailable("plugin", "", "no_plugin");
      const { AdMob, AdmobConsentStatus } = await plugin();
      let info;
      try {
        info = await AdMob.requestConsentInfo();
        if (
          info.status === AdmobConsentStatus.REQUIRED &&
          info.isConsentFormAvailable
        )
          info = await AdMob.showConsentForm();
      } catch (e) {
        throw unavailable(e, "consent");
      }
      if (!info.canRequestAds)
        throw new AdUnavailable("consent", info.status, "cannot_request_ads");
      try {
        await AdMob.initialize({ initializeForTesting: unit.isTesting });
      } catch (e) {
        throw unavailable(e, "init");
      }
      return true;
    },
    async load() {
      const { AdMob } = await plugin();
      try {
        await AdMob.prepareRewardVideoAd(unit);
        return true;
      } catch (e) {
        throw unavailable(e, "load");
      }
    },
    async show() {
      const { AdMob, RewardAdPluginEvents: E } = await plugin();
      let earned = false;
      const handles: PluginListenerHandle[] = [];
      return new Promise<AdOutcome>((resolve) => {
        let done = false;
        const finish = (o: AdOutcome) => {
          if (done) return;
          done = true;
          handles.forEach((h) => void h.remove());
          resolve(o);
        };
        void (async () => {
          handles.push(
            await AdMob.addListener(E.Rewarded, () => {
              earned = true;
            }),
            // A recompensa costuma chegar antes do fechamento; a folga cobre a ordem trocada.
            await AdMob.addListener(E.Dismissed, () =>
              setTimeout(
                () =>
                  finish(
                    earned
                      ? { earned: true }
                      : { earned: false, reason: "closed_early" },
                  ),
                300,
              ),
            ),
            await AdMob.addListener(E.FailedToShow, () =>
              finish({ earned: false, reason: "show_failed" }),
            ),
          );
          AdMob.showRewardVideoAd().catch(() =>
            finish({ earned: false, reason: "show_failed" }),
          );
        })().catch(() => finish({ earned: false, reason: "show_failed" }));
      });
    },
  };
}

/** Segundos do vídeo simulado até a recompensa. */
export const SIM_SECONDS = 3;

/** Vídeo simulado: uma tela por cima com contagem; fechar antes do fim não paga. */
function simDriver(): AdDriver {
  return {
    setup: async () => true,
    load: () => new Promise((r) => setTimeout(() => r(true), 500)),
    show: () =>
      new Promise<AdOutcome>((resolve) => {
        let left = SIM_SECONDS;
        let earned = false;
        const box = document.createElement("div");
        box.className = "rewarded-sim";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", t.simTitle);
        box.innerHTML = `<div class="rewarded-sim-card"><b></b><p aria-live="polite"></p><button type="button" class="button primary"></button></div>`;
        const [title, text, close] = [
          box.querySelector("b")!,
          box.querySelector("p")!,
          box.querySelector("button")!,
        ];
        title.textContent = t.simTitle;
        close.textContent = t.simClose;
        const paint = () => {
          text.textContent = earned ? t.simDone : t.simWait(left);
        };
        paint();
        const timer = setInterval(() => {
          left--;
          if (left <= 0) {
            earned = true;
            clearInterval(timer);
          }
          paint();
        }, 1000);
        close.onclick = () => {
          clearInterval(timer);
          box.remove();
          resolve(
            earned
              ? { earned: true }
              : { earned: false, reason: "closed_early" },
          );
        };
        document.body.append(box);
        close.focus();
      }),
  };
}

let driver: AdDriver | undefined;
let started: Promise<void> | undefined;
let retries = 0;
const RETRY_MS = 60_000;
const MAX_RETRIES = 3;

/** Troca quem toca o vídeo (testes). Também zera o início, para `startRewarded` rodar de novo. */
export function setAdDriver(d: AdDriver | undefined) {
  driver = d;
  started = undefined;
  retries = 0;
  useRewarded.setState({ ready: false, busy: false });
}

/**
 * Por que o vídeo não ficou disponível (diagnóstico): a etapa (plugin, consentimento, início do SDK
 * ou carga), o código do SDK e a tentativa. Sem isso, um vídeo que não carrega some em silêncio.
 */
function reportUnavailable(e: unknown, fallback: AdStage, attempt = 0) {
  const u = unavailable(e, fallback);
  track("rewarded_unavailable", {
    step: u.stage,
    code: u.code || "none",
    reason: u.message.slice(0, 90),
    attempt,
  });
}

async function load() {
  if (!driver || useRewarded.getState().ready) return;
  const attempt = retries;
  const ok = await driver.load().catch((e) => {
    reportUnavailable(e, "load", attempt);
    return false;
  });
  useRewarded.setState({ ready: ok });
  if (ok) track("rewarded_ready", { attempt });
  if (!ok && retries++ < MAX_RETRIES) setTimeout(() => void load(), RETRY_MS);
}

/**
 * Prepara o vídeo premiado (uma vez por abertura): consentimento, SDK e o primeiro vídeo. Com a
 * opção desligada, ou sem anúncio neste aparelho, nada acontece e os botões não aparecem.
 */
export function startRewarded() {
  if (!rewardedEnabled()) return Promise.resolve();
  return (started ??= (async () => {
    driver ??= native()
      ? admobDriver()
      : canSimulate()
        ? simDriver()
        : undefined;
    if (!driver) return;
    const ok = await driver.setup().catch((e) => {
      reportUnavailable(e, "init");
      return false;
    });
    if (ok) await load();
  })());
}

/** Pode oferecer o vídeo agora: opção ligada, vídeo carregado e limite do dia não alcançado. */
export const canOffer = (ready: boolean, left: number) =>
  rewardedEnabled() && ready && left > 0;

/**
 * Toca o vídeo e, só se ele for assistido até o fim, credita `coins` moedas (com `doubleKey`, marca
 * a partida como dobrada). Depois carrega o próximo vídeo.
 */
export async function watchRewarded(
  place: RewardedPlace,
  coins: number,
  doubleKey?: string,
): Promise<AdOutcome> {
  const fail = (reason: string): AdOutcome => {
    track("rewarded_failed", { place, reason });
    return { earned: false, reason };
  };
  const { ready, busy } = useRewarded.getState();
  if (busy) return { earned: false, reason: "busy" };
  if (!driver || !ready || !rewardedEnabled()) return fail("not_ready");
  if (videosLeft(usePlayer.getState().player.rewarded, today()) <= 0)
    return fail("limit");
  useRewarded.setState({ busy: true, ready: false });
  track("rewarded_started", { place });
  let outcome: AdOutcome;
  try {
    outcome = await driver.show();
  } catch {
    outcome = { earned: false, reason: "show_failed" };
  }
  useRewarded.setState({ busy: false });
  retries = 0;
  void load();
  if (!outcome.earned) return fail(outcome.reason);
  usePlayer.getState().update((p) => creditVideo(p, today(), coins, doubleKey));
  track("rewarded_earned", { place, coins });
  return outcome;
}
