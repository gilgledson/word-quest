import { afterEach, describe, expect, it, vi } from "vitest";

// No app Android a medição vai pelo plugin nativo: aqui ele é um dublê que guarda os eventos.
const logEvent = vi.fn(() => Promise.resolve());
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({
    logEvent,
    recordError: () => Promise.resolve(),
    setContext: () => Promise.resolve(),
  }),
}));

const { track } = await import("../services/telemetry");
const { setLang } = await import("../i18n");

describe("idioma na medição", () => {
  afterEach(() => {
    setLang("pt");
    logEvent.mockClear();
  });
  it("todo evento leva o idioma do jogo, para comparar os públicos", () => {
    track("duel_start", { mode: "aventura" });
    setLang("en");
    track("first_move");
    expect(logEvent.mock.calls).toEqual([
      [{ name: "duel_start", params: { mode: "aventura", lang: "pt" } }],
      [{ name: "first_move", params: { lang: "en" } }],
    ]);
  });
});
