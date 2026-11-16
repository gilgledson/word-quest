import { describe, expect, it } from "vitest";
import { reportError, screenOf, track } from "../services/telemetry";

describe("medição de uso", () => {
  it("dá nome às telas sem levar código de sala nem número da grade", () => {
    expect(screenOf("/")).toBe("home");
    expect(screenOf("/map/vila")).toBe("mapa");
    expect(screenOf("/casual")).toBe("casual");
    expect(screenOf("/daily")).toBe("diario");
    expect(screenOf("/profile")).toBe("perfil");
    expect(screenOf("/online")).toBe("online_lobby");
    expect(screenOf("/online/ABC234")).toBe("partida_online");
    expect(screenOf("/play/daily")).toBe("partida_diario");
    expect(screenOf("/play/casual-animais-3")).toBe("partida_casual");
    expect(screenOf("/play/vila-1")).toBe("partida_aventura");
    expect(screenOf("/qualquer")).toBe("outra");
  });
  it("no navegador não chama nada e não lança", () => {
    expect(() => track("duel_end", { result: "win" })).not.toThrow();
    expect(() => reportError(new Error("x"))).not.toThrow();
    expect(() => reportError("texto solto")).not.toThrow();
  });
});
