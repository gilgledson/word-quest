import { beforeEach, describe, expect, it, vi } from "vitest";
import { EFFECTS } from "../services/sound";
import { initialPlayer } from "../services/repository";

const impact = vi.fn((_o: unknown) => Promise.resolve());
const notification = vi.fn((_o: unknown) => Promise.resolve());
vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: (o: unknown) => impact(o),
    notification: (o: unknown) => notification(o),
  },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));
beforeEach(() => {
  impact.mockClear();
  notification.mockClear();
});

describe("Vibração", () => {
  it("vem ligada por padrão", () => {
    expect(initialPlayer.vibration).toBe(true);
  });
  it("todo efeito sonoro tem uma vibração definida (ou nenhuma, de propósito)", async () => {
    const { BUZZ } = await import("../services/haptics");
    expect(Object.keys(BUZZ).sort()).toEqual(Object.keys(EFFECTS).sort());
  });
  it("peça colocada vibra leve; acertar firme; vitória e erro como notificação", async () => {
    const { buzz } = await import("../services/haptics");
    buzz(true, "place");
    expect(impact).toHaveBeenLastCalledWith({ style: "LIGHT" });
    buzz(true, "correct");
    expect(impact).toHaveBeenLastCalledWith({ style: "MEDIUM" });
    buzz(true, "win");
    expect(notification).toHaveBeenLastCalledWith({ type: "SUCCESS" });
    buzz(true, "wrong");
    expect(notification).toHaveBeenLastCalledWith({ type: "WARNING" });
    buzz(true, "lose");
    expect(notification).toHaveBeenLastCalledWith({ type: "ERROR" });
  });
  it("desligada não vibra, e o passe do oponente nunca vibra", async () => {
    const { buzz } = await import("../services/haptics");
    buzz(false, "win");
    buzz(true, "botPass");
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });
  it("uma falha do aparelho não derruba o jogo", async () => {
    impact.mockRejectedValueOnce(new Error("sem vibrador"));
    const { buzz } = await import("../services/haptics");
    expect(() => buzz(true, "place")).not.toThrow();
  });
});
