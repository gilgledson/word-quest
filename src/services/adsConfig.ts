/**
 * Configuração do vídeo premiado (AdMob). Desligado por padrão: para ligar, troque `enabled` para
 * `true` (ou gere o build com `VITE_REWARDED_ADS=1`) e preencha `rewardedAndroid` com o ID do bloco
 * de anúncio premiado criado no AdMob. Sem ID real, o jogo usa o bloco de teste do Google, que só
 * mostra anúncios de teste (nunca paga nem conta como tráfego inválido).
 */
export const ADS_CONFIG = {
  /** Liga o vídeo premiado no app (botões na loja e no fim do duelo). */
  enabled: false,
  /** Bloco de anúncio premiado do Android (ca-app-pub-XXXX/YYYY). Vazio = bloco de teste. */
  rewardedAndroid: "",
};

/** Bloco premiado de teste oficial do Google (Android). */
export const TEST_REWARDED_ANDROID = "ca-app-pub-3940256099942544/5224354917";

/** No navegador de desenvolvimento, `localStorage["wordquest.rewardedAds"] = "1"` liga para testar. */
export const DEV_FLAG_KEY = "wordquest.rewardedAds";

function devOverride() {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(DEV_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** O vídeo premiado está ligado nesta versão. */
export function rewardedEnabled() {
  const env = import.meta.env.VITE_REWARDED_ADS;
  if (env === "0") return false;
  return ADS_CONFIG.enabled || env === "1" || devOverride();
}

/** Bloco a pedir: o real só no build da loja com ID preenchido; no resto, o de teste. */
export function rewardedUnit() {
  const real =
    import.meta.env.VITE_ADMOB_REWARDED_ID || ADS_CONFIG.rewardedAndroid;
  const testing = import.meta.env.DEV || !real;
  return { adId: testing ? TEST_REWARDED_ANDROID : real, isTesting: testing };
}
