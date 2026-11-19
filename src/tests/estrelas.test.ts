import { describe, expect, it } from "vitest";
import { duelStars, economy } from "../game/crossword-engine";

describe("estrelas da vitória", () => {
  it("vêm da parte dos pontos do jogador, não da dificuldade do rival", () => {
    expect(economy.starShare).toEqual([0.6, 0.75]);
    // Vitória apertada: 1 estrela.
    expect(duelStars({ p: 31, ai: 29 })).toBe(1);
    // 59 × 34 = 63% dos pontos: 2 estrelas.
    expect(duelStars({ p: 59, ai: 34 })).toBe(2);
    // Exatamente nos limites.
    expect(duelStars({ p: 60, ai: 40 })).toBe(2);
    expect(duelStars({ p: 75, ai: 25 })).toBe(3);
    // Rival zerado: 3 estrelas.
    expect(duelStars({ p: 12, ai: 0 })).toBe(3);
  });
  it("empate e derrota não dão estrelas", () => {
    expect(duelStars({ p: 30, ai: 30 })).toBe(0);
    expect(duelStars({ p: 10, ai: 40 })).toBe(0);
    expect(duelStars({ p: 0, ai: 0 })).toBe(0);
  });
});
