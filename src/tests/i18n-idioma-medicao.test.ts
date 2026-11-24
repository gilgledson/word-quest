import { beforeEach, describe, expect, it, vi } from "vitest";

// App Android: a medição vai pelo plugin nativo, aqui um dublê que guarda as chamadas.
const logEvent = vi.fn(() => Promise.resolve());
const setUserProperty = vi.fn(() => Promise.resolve());
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({
    logEvent,
    setUserProperty,
    recordError: () => Promise.resolve(),
    setContext: () => Promise.resolve(),
  }),
}));

/** Cada teste é uma abertura nova do app (o idioma é lido uma vez por sessão). */
async function open() {
  vi.resetModules();
  const i18n = await import("../i18n");
  const telemetry = await import("../services/telemetry");
  return { i18n, telemetry };
}
const events = () =>
  (logEvent.mock.calls as unknown as [{ name: string; params: object }][]).map(
    ([e]) => e,
  );

describe("idioma na medição: troca e origem", () => {
  beforeEach(() => {
    localStorage.clear();
    logEvent.mockClear();
    setUserProperty.mockClear();
  });

  it("primeira abertura: idioma do aparelho vira evento e propriedade de usuário", async () => {
    const { telemetry } = await open();
    telemetry.trackLanguage();
    // jsdom diz en-US: o jogo abre em inglês.
    expect(setUserProperty).toHaveBeenCalledWith({ name: "lang", value: "en" });
    expect(events()).toEqual([
      {
        name: "language_detected",
        params: { device_lang: "en", lang: "en" },
      },
    ]);
  });

  it("abertura seguinte sem troca: só a propriedade de usuário", async () => {
    localStorage.setItem("wordquest.lang", "pt");
    const { telemetry } = await open();
    telemetry.trackLanguage();
    expect(setUserProperty).toHaveBeenCalledWith({ name: "lang", value: "pt" });
    expect(events()).toEqual([]);
  });

  it("troca nas Configurações: medida na abertura seguinte, uma vez só", async () => {
    localStorage.setItem("wordquest.lang", "pt");
    const first = await open();
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    first.i18n.changeLang("en");
    vi.unstubAllGlobals();
    expect(assign).toHaveBeenCalledWith("/");

    const again = await open();
    again.telemetry.trackLanguage();
    expect(events()).toEqual([
      {
        name: "language_changed",
        params: { from: "pt", to: "en", lang: "en" },
      },
    ]);

    logEvent.mockClear();
    const third = await open();
    third.telemetry.trackLanguage();
    expect(events()).toEqual([]);
  });
});
