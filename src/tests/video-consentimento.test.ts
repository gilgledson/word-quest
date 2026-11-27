import { beforeEach, describe, expect, it, vi } from "vitest";

// O driver do AdMob com o plugin falso: o pedido de consentimento pode falhar (mensagem não
// configurada no AdMob, sem rede), e isso não pode impedir o SDK de iniciar.
const admob = vi.hoisted(() => ({
  requestConsentInfo: vi.fn(),
  showConsentForm: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: admob,
  AdmobConsentStatus: {
    REQUIRED: "REQUIRED",
    NOT_REQUIRED: "NOT_REQUIRED",
    OBTAINED: "OBTAINED",
  },
}));
vi.mock("@capacitor/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...mod,
    Capacitor: { ...mod.Capacitor, isPluginAvailable: () => true },
  };
});
const tracked = vi.hoisted(() => [] as { name: string; params?: object }[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: object) => tracked.push({ name, params }),
  };
});

import { AdUnavailable, admobDriver } from "../services/rewardedAds";

const NO_FORM =
  "Publisher misconfiguration: Failed to read publisher's account configuration; no form(s) configured";

beforeEach(() => {
  tracked.length = 0;
  admob.requestConsentInfo.mockReset();
  admob.showConsentForm.mockReset();
  admob.initialize.mockReset().mockResolvedValue(undefined);
});

describe("vídeo premiado: consentimento", () => {
  it("pedido de consentimento falhou: registra e inicia o SDK mesmo assim", async () => {
    admob.requestConsentInfo.mockRejectedValue({ code: 3, message: NO_FORM });
    await expect(admobDriver().setup()).resolves.toBe(true);
    expect(admob.initialize).toHaveBeenCalledTimes(1);
    expect(tracked).toEqual([
      {
        name: "rewarded_consent_error",
        params: { code: "3", reason: NO_FORM.slice(0, 90) },
      },
    ]);
  });
  it("consentimento não exigido: inicia o SDK sem formulário nem registro", async () => {
    admob.requestConsentInfo.mockResolvedValue({
      status: "NOT_REQUIRED",
      isConsentFormAvailable: false,
      canRequestAds: true,
    });
    await expect(admobDriver().setup()).resolves.toBe(true);
    expect(admob.showConsentForm).not.toHaveBeenCalled();
    expect(admob.initialize).toHaveBeenCalledTimes(1);
    expect(tracked).toEqual([]);
  });
  it("na Europa, quem não consentiu segue sem anúncio (o SDK nem inicia)", async () => {
    admob.requestConsentInfo.mockResolvedValue({
      status: "REQUIRED",
      isConsentFormAvailable: true,
      canRequestAds: false,
    });
    admob.showConsentForm.mockResolvedValue({
      status: "REQUIRED",
      canRequestAds: false,
    });
    await expect(admobDriver().setup()).rejects.toBeInstanceOf(AdUnavailable);
    expect(admob.showConsentForm).toHaveBeenCalledTimes(1);
    expect(admob.initialize).not.toHaveBeenCalled();
  });
});
