import {
  PuzzleEngine,
  positions,
  type Puzzle,
  type Session,
} from "../game/crossword-engine";

/**
 * Joga a grade inteira só com ações gratuitas (põe letras certas e confirma, sem Dica nem Trocar)
 * e diz se ela chega ao fim sem peças sobrando. Usado na publicação do conteúdo.
 */
export function finishesForFree(puzzle: Puzzle): boolean {
  const engine = new PuzzleEngine(puzzle);
  const solution = Object.fromEntries(
    puzzle.words.flatMap((w) => positions(w).map((c) => [c.key, c.letter])),
  );
  const wordAt = (cell: string) =>
    puzzle.words.find((w) => positions(w).some((c) => c.key === cell))!;
  const pending = (s: Session) =>
    s.history.filter((k) => s.letters[k] && !s.locked.includes(k));
  const useful = (s: Session) => {
    for (const id of s.rack)
      for (const [k, letter] of Object.entries(solution))
        if (!s.letters[k] && s.tiles[id].letter === letter)
          return { id, cell: k };
    return undefined;
  };
  let s = engine.start("publicacao", "medio");
  for (let step = 0; step < 800 && !engine.complete(s); step++) {
    const wrong = pending(s).some((k) => s.letters[k] !== solution[k]);
    const move = wrong ? undefined : useful(s);
    s = move
      ? engine.insert(s, wordAt(move.cell).id, move.id, move.cell)
      : engine.confirm(s, "p").session;
    if (engine.rack.audit(s).length) return false;
  }
  s = engine.confirm(s, "p").session;
  return engine.complete(s) && engine.rack.audit(s).length === 0;
}
