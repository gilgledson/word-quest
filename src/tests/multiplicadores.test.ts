import { describe, expect, it } from "vitest";
import { levels, levelVariants, dailyPuzzle } from "../data/catalog";
import {
  PuzzleEngine,
  multipliers,
  positions,
  type Session,
} from "../game/crossword-engine";

const all = [
  ...levels,
  ...levelVariants.slice(0, 40),
  dailyPuzzle("2026-11-19"),
];
const letterCells = (p: (typeof levels)[number]) =>
  new Set(p.words.flatMap((w) => positions(w).map((c) => c.key)));

/** Põe no banco a peça da letra pedida (tirada da reserva ou do oponente) e devolve o id. */
const give = (s: Session, letter: string): [Session, string] => {
  const id = Object.keys(s.tiles).find(
    (t) =>
      s.tiles[t].letter === letter &&
      !s.tiles[t].cell &&
      !s.tiles[t].joker &&
      (s.supply.includes(t) || s.botRack.includes(t) || s.rack.includes(t)),
  )!;
  return [
    {
      ...s,
      rack: [...s.rack.filter((t) => t !== id), id],
      supply: s.supply.filter((t) => t !== id),
      botRack: s.botRack.filter((t) => t !== id),
    },
    id,
  ];
};

describe("Casas especiais (2× e 3× letra)", () => {
  it.each(all.map((p) => [p.id, p] as const))(
    "%s: de 2 a 3 casas de letra, uma 3×, afastadas e sempre as mesmas",
    (_, p) => {
      const m = multipliers(p);
      const keys = Object.keys(m);
      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys.length).toBeLessThanOrEqual(3);
      const cells = letterCells(p);
      for (const k of keys) expect(cells.has(k)).toBe(true);
      expect(Object.values(m).filter((x) => x === 3)).toHaveLength(1);
      expect(Object.values(m).filter((x) => x === 2)).toHaveLength(
        keys.length - 1,
      );
      for (const a of keys)
        for (const b of keys) {
          if (a === b) continue;
          const [r1, c1] = a.split(",").map(Number);
          const [r2, c2] = b.split(",").map(Number);
          expect(Math.abs(r1 - r2) + Math.abs(c1 - c2)).toBeGreaterThanOrEqual(
            3,
          );
        }
      // O mesmo sorteio sempre (os dois jogadores do duelo ao vivo veem as mesmas casas).
      expect(multipliers(p)).toEqual(m);
    },
  );

  it("a letra posta numa casa 2× ou 3× vale o dobro ou o triplo; o extra entra no bônus", () => {
    const p = levels[1];
    const engine = new PuzzleEngine(p);
    for (const [cell, mult] of Object.entries(engine.rack.bonus)) {
      const word = p.words.find((w) =>
        positions(w).some((c) => c.key === cell),
      )!;
      const [s, tile] = give(
        engine.start("mult", "medio"),
        engine.rack.solution[cell],
      );
      const r = engine.confirm(engine.insert(s, word.id, tile, cell), "p");
      expect(r.gained).toBe(1);
      expect(r.session.scores.p).toBe(mult);
      expect(r.bonus).toBe(mult - 1);
    }
  });

  it("o rival também ganha o extra das casas especiais", () => {
    const p = levels[1];
    const engine = new PuzzleEngine(p);
    const [cell, mult] = Object.entries(engine.rack.bonus)[0];
    let s = engine.start("mult-bot", "medio");
    const letter = engine.rack.solution[cell];
    // A peça certa na mão do rival.
    const id = Object.keys(s.tiles).find(
      (t) =>
        s.tiles[t].letter === letter &&
        !s.tiles[t].cell &&
        (s.supply.includes(t) || s.botRack.includes(t)),
    )!;
    s = {
      ...s,
      supply: s.supply.filter((t) => t !== id),
      botRack: [...s.botRack.filter((t) => t !== id), id],
    };
    const r = engine.play(s, [cell], "ai")!;
    expect(r.gained).toBe(1);
    expect(r.session.scores.ai).toBe(mult);
  });

  it("o valor de fechar a palavra conta o extra das casas especiais ainda livres", () => {
    const p = levels[1];
    const engine = new PuzzleEngine(p);
    const s = engine.start("valor", "medio");
    for (const w of p.words) {
      const extra = positions(w).reduce(
        (n, c) => n + ((engine.rack.bonus[c.key] ?? 1) - 1),
        0,
      );
      expect(engine.wordValue(s, w)).toBe(positions(w).length + extra);
    }
    expect(engine.rack.boostOf([])).toBe(0);
  });
});
