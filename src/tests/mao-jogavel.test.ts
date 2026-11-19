import { describe, expect, it } from "vitest";
import { levels } from "../data/catalog";
import {
  PuzzleEngine,
  positions,
  type Session,
} from "../game/crossword-engine";
import { tutorialPick } from "../features/puzzle/tutorialPick";

const puzzle = levels[0];
const engine = new PuzzleEngine(puzzle);
const short = (s: Session): Session => ({
  ...s,
  versus: { ...s.versus, rounds: 6 },
});
const allTiles = (s: Session) =>
  [...s.rack, ...s.botRack, ...s.supply, ...Object.keys(s.tiles)].length;
const closesSomething = (s: Session) =>
  puzzle.words.some((w) => engine.rack.completes(s, w));
/** Mão que não fecha palavra nenhuma: uma peça só (toda palavra ainda pede mais de uma letra). */
function stuckHand(s: Session): Session {
  const out = structuredClone(s);
  out.supply.push(...out.rack);
  out.rack = [];
  const id = out.supply.find((x) => !out.tiles[x].joker)!;
  out.supply = out.supply.filter((x) => x !== id);
  out.rack.push(id);
  return out;
}

describe("mão jogável no primeiro duelo", () => {
  it("sem palavra que feche, o banco passa a ter as letras de uma palavra curta", () => {
    const stuck = stuckHand(short(engine.start("seed", "facil")));
    expect(closesSomething(stuck)).toBe(false);
    const fixed = engine.rack.keepCompletable(stuck);
    expect(closesSomething(fixed)).toBe(true);
    expect(fixed.rack.length).toBe(5);
    // Nenhuma peça criada nem perdida: as mesmas peças, em outros lugares.
    const ids = (s: Session) => [...s.rack, ...s.botRack, ...s.supply].sort();
    expect(ids(fixed)).toEqual(ids(stuck));
    expect(allTiles(fixed)).toBe(allTiles(stuck));
  });

  it("se o banco já fecha alguma palavra, nada muda", () => {
    const s = short(engine.start("seed", "facil"));
    const word = puzzle.words.find((w) => engine.rack.dealWord(s, w))!;
    const ready = engine.rack.dealWord(s, word)!;
    expect(engine.rack.keepCompletable(ready)).toBe(ready);
  });

  it("depois do ✓ do jogador, a nova mão fecha uma palavra; fora do primeiro duelo, não interfere", () => {
    const base = engine.start("seed", "facil");
    const word = puzzle.words.find((w) => engine.rack.dealWord(base, w))!;
    let s = short(engine.rack.dealWord(base, word)!);
    for (const c of positions(word)) {
      const id = s.rack.find((x) => s.tiles[x].letter === c.letter)!;
      s = engine.insert(s, word.id, id, c.key);
    }
    const after = engine.confirm(s, "p").session;
    expect(closesSomething(after)).toBe(true);

    // Duelo normal (sem rodadas): a reposição continua sendo a de sempre.
    const normal = { ...s, versus: { ...s.versus, rounds: undefined } };
    const plain = engine.confirm(normal, "p").session;
    expect(plain.versus.rounds).toBeUndefined();
  });

  it("a palavra em foco é uma que o banco fecha, a mais curta", () => {
    const s = short(engine.start("seed", "facil"));
    const word = puzzle.words
      .filter((w) => engine.rack.dealWord(s, w))
      .sort((a, b) => a.answer.length - b.answer.length)[0];
    const dealt = engine.rack.dealWord(s, word)!;
    const pick = tutorialPick(puzzle, dealt)!;
    const picked = puzzle.words.find((w) => w.id === pick.wordId)!;
    expect(engine.rack.completes(dealt, picked)).toBe(true);
  });
});
