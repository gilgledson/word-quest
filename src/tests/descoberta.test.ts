import { expect, it } from "vitest";
import { levels } from "../data/catalog";
import {
  positions,
  PuzzleEngine,
  type Owner,
  type Session,
} from "../game/crossword-engine";
import { settleSession } from "../features/puzzle/settleSession";
import { initialPlayer, type Player } from "../services/repository";

const puzzle = levels[0];
const engine = new PuzzleEngine(puzzle);
const ctx = {
  engine,
  puzzleId: puzzle.id,
  sessionKey: "k",
  daily: false,
  casual: false,
  date: "2026-10-31",
};
const fresh = () => engine.start("seed", "facil");
/** Sessão com a palavra fechada: as casas novas ficam travadas e são de `who`. */
const close = (s: Session, wordIndex: number, who: Owner): Session => {
  const cells = positions(puzzle.words[wordIndex]).map((c) => c.key);
  const owners = { ...s.owners };
  for (const k of cells) if (!s.locked.includes(k)) owners[k] = who;
  return {
    ...s,
    locked: [...new Set([...s.locked, ...cells])],
    owners,
  };
};
const player = (patch: Partial<Player> = {}): Player => ({
  ...structuredClone(initialPlayer),
  ...patch,
});

it("fechar uma palavra conta como descoberta, uma vez só", () => {
  const start = fresh();
  let p = player({ sessions: { k: start } });
  p = settleSession(p, close(start, 0, "p"), 0, ctx);
  expect(p.wordsFound[puzzle.id]).toEqual([puzzle.words[0].id]);
  // Gravar de novo a mesma sessão não soma de novo.
  p = settleSession(p, p.sessions.k, 0, ctx);
  expect(p.wordsFound[puzzle.id]).toHaveLength(1);
});
it("palavra fechada pelo oponente não conta", () => {
  const start = fresh();
  const p = settleSession(
    player({ sessions: { k: start } }),
    close(start, 0, "ai"),
    0,
    ctx,
  );
  expect(p.wordsFound).toEqual({});
});
it("refazer a fase não conta as mesmas palavras de novo, mas as novas sim", () => {
  const start = fresh();
  let p = settleSession(
    player({ sessions: { k: start } }),
    close(start, 0, "p"),
    0,
    ctx,
  );
  // Jogar novamente: sessão nova na mesma fase.
  const again = engine.start("outra", "facil");
  p = { ...p, sessions: { ...p.sessions, k: again } };
  p = settleSession(p, close(again, 0, "p"), 0, ctx);
  expect(p.wordsFound[puzzle.id]).toEqual([puzzle.words[0].id]);
  p = { ...p, sessions: { ...p.sessions, k: close(again, 0, "p") } };
  p = settleSession(p, close(close(again, 0, "p"), 1, "p"), 0, ctx);
  expect(p.wordsFound[puzzle.id]).toEqual([
    puzzle.words[0].id,
    puzzle.words[1].id,
  ]);
});
/** Trava só as casas dadas (parte de uma palavra), com o dono indicado. */
const lockSome = (s: Session, keys: string[], who: Owner): Session => ({
  ...s,
  locked: [...new Set([...s.locked, ...keys])],
  owners: {
    ...s.owners,
    ...Object.fromEntries(
      keys.filter((k) => !s.locked.includes(k)).map((k) => [k, who]),
    ),
  },
});
it("só conta para quem joga a última letra: o oponente fecha, não conta", () => {
  const cells = positions(puzzle.words[0]).map((c) => c.key);
  const start = fresh();
  // O jogador coloca todas menos a última; o oponente fecha a palavra.
  const partial = lockSome(start, cells.slice(0, -1), "p");
  let p = settleSession(player({ sessions: { k: start } }), partial, 0, ctx);
  expect(p.wordsFound).toEqual({});
  p = settleSession(p, lockSome(partial, cells.slice(-1), "ai"), 0, ctx);
  expect(p.wordsFound).toEqual({});
});
it("o oponente coloca as primeiras e o jogador fecha: conta para o jogador", () => {
  const cells = positions(puzzle.words[0]).map((c) => c.key);
  const start = fresh();
  const partial = lockSome(start, cells.slice(0, -1), "ai");
  let p = settleSession(player({ sessions: { k: start } }), partial, 0, ctx);
  p = settleSession(p, lockSome(partial, cells.slice(-1), "p"), 0, ctx);
  expect(p.wordsFound[puzzle.id]).toEqual([puzzle.words[0].id]);
});
