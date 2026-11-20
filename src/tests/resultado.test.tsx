import { cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { Session } from "../game/crossword-engine";
import { medalsFor, summarize } from "../features/puzzle/summary";

afterEach(cleanup);

const session = (
  owners: Record<string, "p" | "ai">,
  locked: string[],
  scores = { p: 12, ai: 4 },
  hinted: string[] = [],
) => ({ owners, locked, scores, hinted }) as unknown as Session;

it("resume quem confirmou as letras e quantas vieram da Dica", () => {
  const s = summarize(
    session(
      { "0,0": "p", "0,1": "p", "0,2": "ai" },
      ["0,0", "0,1", "0,2"],
      { p: 12, ai: 4 },
      ["0,1"],
    ),
  );
  expect(s.letters).toEqual({ p: 2, ai: 1 });
  expect(s.helped).toBe(1);
  expect(s.result).toBe("win");
});
it("medalhas: só vitória rende, e cada uma tem seu critério", () => {
  const owners = { a: "p", b: "p", c: "p", d: "ai" } as const;
  const win = summarize(
    session({ ...owners }, ["a", "b", "c", "d"], { p: 16, ai: 4 }),
  );
  expect(medalsFor(win).map((m) => m.id)).toEqual([
    "sem-ajuda",
    "folgada",
    "dono",
  ]);
  const helped = summarize(
    session({ ...owners }, ["a", "b", "c", "d"], { p: 16, ai: 4 }, ["a"]),
  );
  expect(medalsFor(helped).map((m) => m.id)).toEqual(["folgada", "dono"]);
  const close = summarize(
    session({ ...owners }, ["a", "b", "c", "d", "e"], { p: 6, ai: 5 }, ["e"]),
  );
  expect(medalsFor(close).map((m) => m.id)).toEqual(["apertada", "dono"]);
  const loss = summarize(session({ ...owners }, ["a"], { p: 1, ai: 9 }));
  expect(medalsFor(loss)).toEqual([]);
});
