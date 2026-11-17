import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import type { Session } from "../game/crossword-engine";
import { medalsFor, summarize } from "../features/puzzle/summary";
import { ResultPopup } from "../features/ResultPopup";
import { OPPONENTS } from "../game/opponents";

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
const popup = (
  summary: ReturnType<typeof summarize>,
  achievements: string[] = [],
) =>
  render(
    <MemoryRouter>
      <ResultPopup
        result="win"
        rival={OPPONENTS[0]}
        mood="sad"
        moodKey={1}
        scores={{ p: 16, ai: 4 }}
        coins={50}
        stars={1}
        summary={summary}
        achievements={achievements}
        enabled={false}
        onClose={() => {}}
      />
    </MemoryRouter>,
  );
const threeMedals = () =>
  summarize(
    session({ a: "p", b: "p", c: "p", d: "ai" }, ["a", "b", "c", "d"], {
      p: 16,
      ai: 4,
    }),
  );
it("as medalhas viram selos ao lado das moedas: uma à vista e o resto em +N", () => {
  popup(threeMedals());
  const medals = screen.getByLabelText("Medalhas desta partida");
  expect(medals).toHaveTextContent("Sem ajuda");
  expect(medals).toHaveTextContent("+2");
  // As outras não somem: ficam no "+2" para leitores de tela.
  expect(medals).toHaveTextContent("Vitória folgada");
  expect(medals).toHaveTextContent("Dono da grade");
});
it("com conquista nova, ela ocupa o lugar das medalhas", () => {
  popup(threeMedals(), ["Mão certeira"]);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Conquista: Mão certeira. Resgate no Perfil.",
  );
  expect(screen.queryByLabelText("Medalhas desta partida")).toBeNull();
});
