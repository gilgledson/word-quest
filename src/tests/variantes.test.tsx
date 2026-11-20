import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import {
  dailyPuzzle,
  levelGrid,
  levels,
  levelVariants,
  variantCount,
} from "../data/catalog";
import { PuzzlePage } from "../features/PuzzlePage";
import { PuzzleEngine, positions } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);

const answers = (id: string, variant: number) =>
  new Set(levelGrid(id, variant)!.words.map((w) => w.answer));

it("toda fase depois do tutorial tem grades alternativas, com palavras diferentes", () => {
  expect(variantCount(levels[0].id)).toBe(1);
  for (const level of levels.slice(1)) {
    const count = variantCount(level.id);
    expect(count).toBeGreaterThanOrEqual(3);
    for (let a = 0; a < count; a++)
      for (let b = a + 1; b < count; b++) {
        const mine = answers(level.id, a);
        const shared = [...mine].filter((w) => answers(level.id, b).has(w));
        expect(shared.length / mine.size).toBeLessThanOrEqual(0.5);
      }
  }
});
it("a variante é a mesma fase: id, número, mundo e tamanho da original", () => {
  for (const grid of levelVariants) {
    const level = levels.find((l) => l.id === grid.id)!;
    expect(grid).toMatchObject({
      number: level.number,
      world: level.world,
      rows: level.rows,
      cols: level.cols,
    });
  }
  // O índice dá a volta: depois da última variante vem a grade original.
  const id = levels[1].id;
  expect(levelGrid(id, variantCount(id))).toBe(levels[1]);
});
it("o desafio diário sorteia também entre as grades alternativas", () => {
  const seen = new Set<unknown>();
  for (let day = 1; day <= 28; day++)
    for (let month = 1; month <= 12; month++)
      seen.add(
        dailyPuzzle(
          `2027-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        ),
      );
  expect([...seen].some((p) => levelVariants.includes(p as never))).toBe(true);
});
it("perder e tentar de novo abre outra grade da mesma fase", async () => {
  const level = levels[1];
  const key = `vs:${level.id}:medio`;
  const engine = new PuzzleEngine(level);
  const cells = level.words.flatMap((w) => positions(w).map((c) => c.key));
  // Grade fechada com o placar a favor do rival: a partida está perdida.
  const lost = {
    ...engine.play(engine.start(key, "medio"), [...new Set(cells)], "p")!
      .session,
    scores: { p: 1, ai: 99 },
  };
  expect(engine.complete(lost)).toBe(true);
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      tutorialDone: true,
      stars: { [levels[0].id]: 1 },
      sessions: { [key]: lost },
    },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[`/play/${level.id}?vs=medio`]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {
    fireEvent.click(await screen.findByRole("button", { name: /^Revanche/ }));
  });
  const { player } = usePlayer.getState();
  expect(player.variants).toEqual({ [level.id]: 1 });
  const fresh = player.sessions[key];
  expect(fresh.locked).toEqual([]);
  // A sessão nova é da outra grade: as peças têm as letras da solução dela.
  const next = new PuzzleEngine(levelGrid(level.id, 1)!);
  const letters = (list: string[]) => [...list].sort().join("");
  expect(
    letters(
      Object.values(fresh.tiles)
        .filter((t) => !t.joker)
        .map((t) => t.letter),
    ),
  ).toBe(letters(Object.values(next.rack.solution)));
  expect(
    await screen.findByText("Grade nova: toque em uma pista para começar."),
  ).toBeInTheDocument();
});
