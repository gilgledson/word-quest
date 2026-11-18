import { describe, expect, it } from "vitest";
import {
  claimReward,
  LOGIN_REWARDS,
  rewardOf,
  tomorrowCoins,
} from "../game/loginReward";

describe("recompensa por voltar", () => {
  it("o primeiro dia é o dia 1 e pagar duas vezes no mesmo dia não soma de novo", () => {
    const p: { coins: number; loginReward?: { last: string; day: number } } = {
      coins: 100,
    };
    expect(rewardOf(undefined, "2026-11-18")).toEqual({
      day: 1,
      coins: LOGIN_REWARDS[0],
      claimed: false,
    });
    const once = claimReward(p, "2026-11-18");
    expect(once.coins).toBe(100 + LOGIN_REWARDS[0]);
    expect(claimReward(once, "2026-11-18")).toBe(once);
    expect(rewardOf(once.loginReward, "2026-11-18").claimed).toBe(true);
  });
  it("dias seguidos avançam o ciclo, inclusive na virada do mês", () => {
    let p: { coins: number; loginReward?: { last: string; day: number } } = {
      coins: 0,
    };
    const days = [
      "2026-11-28",
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
    ];
    for (const d of days) p = claimReward(p, d);
    expect(p.loginReward).toEqual({ last: "2026-12-04", day: 7 });
    expect(p.coins).toBe(LOGIN_REWARDS.reduce((a, b) => a + b, 0));
    // Depois do 7º, o ciclo recomeça no dia 1.
    expect(rewardOf(p.loginReward, "2026-12-05").day).toBe(1);
  });
  it("pular um dia volta ao dia 1", () => {
    const state = { last: "2026-11-18", day: 4 };
    expect(rewardOf(state, "2026-11-19").day).toBe(5);
    expect(rewardOf(state, "2026-11-20").day).toBe(1);
  });
  it("mostra quanto amanhã rende", () => {
    expect(tomorrowCoins(undefined, "2026-11-18")).toBe(LOGIN_REWARDS[1]);
    expect(tomorrowCoins({ last: "2026-11-18", day: 7 }, "2026-11-18")).toBe(
      LOGIN_REWARDS[0],
    );
  });
});
