import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { levels } from "../../data/catalog";
import {
  PuzzleEngine,
  positions,
  type Puzzle,
  type Session,
} from "../../game/crossword-engine";
import { PuzzlePage } from "../../features/PuzzlePage";
import { Layout } from "../../components/Layout";
import { initialPlayer } from "../../services/repository";
import { usePlayer } from "../../stores/player";

/**
 * Partida quase pronta: todas as casas de duas palavras que se cruzam estão confirmadas, menos a
 * do cruzamento, cuja peça já está no banco. Basta colocar a letra e confirmar.
 */
export function crossScenario(levelIndex = 0, crossNth = 0) {
  const puzzle: Puzzle = levels[levelIndex];
  const engine = new PuzzleEngine(puzzle);
  const key = `vs:${puzzle.id}:medio`;
  const s = JSON.parse(JSON.stringify(engine.start(key, "medio"))) as Session;
  const where: Record<string, string[]> = {};
  for (const w of puzzle.words)
    for (const c of positions(w)) (where[c.key] ??= []).push(w.id);
  const cross = Object.keys(where).filter((k) => where[k].length === 2)[
    crossNth
  ];
  const [a, b] = where[cross].map((id) =>
    puzzle.words.find((w) => w.id === id)!,
  );
  const take = (letter: string) => {
    const t = Object.values(s.tiles).find(
      (x) => x.letter === letter && !x.cell,
    )!;
    s.rack = s.rack.filter((i) => i !== t.id);
    s.supply = s.supply.filter((i) => i !== t.id);
    s.botRack = s.botRack.filter((i) => i !== t.id);
    return t;
  };
  for (const c of [...positions(a), ...positions(b)]) {
    if (c.key === cross || s.locked.includes(c.key)) continue;
    const t = take(c.letter);
    t.cell = c.key;
    s.letters[c.key] = c.letter;
    s.locked.push(c.key);
    s.owners[c.key] = "p";
  }
  const letter = positions(a).find((c) => c.key === cross)!.letter;
  const tile = take(letter);
  s.rack.unshift(tile.id);
  s.rack = s.rack.slice(0, 5);
  return { puzzle, engine, key, session: s, cross, letter, a, b };
}

export function load(
  key: string,
  session: Session | undefined,
  patch: Partial<typeof initialPlayer> = {},
) {
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      ...patch,
      sessions: session ? { [key]: session } : {},
    },
    ready: true,
  });
}

export function mount(puzzleId: string, wrap?: (tree: ReactNode) => ReactNode) {
  const tree = (
    <MemoryRouter initialEntries={[`/play/${puzzleId}?vs=medio`]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>
  );
  return render(wrap ? wrap(tree) : tree);
}

/** Com o cabeçalho (contador de moedas) para testar a recompensa. */
export function mountWithLayout(puzzleId: string) {
  return render(
    <MemoryRouter initialEntries={[`/play/${puzzleId}?vs=medio`]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Partida a uma letra do fim: todas as casas confirmadas pelo jogador, menos a última, cuja peça
 * já está no banco. `lose` dá ao oponente uma pontuação alta para o resultado ser derrota.
 */
export function finishScenario(lose = false) {
  const puzzle: Puzzle = levels[0];
  const engine = new PuzzleEngine(puzzle);
  const key = `vs:${puzzle.id}:medio`;
  const solution: Record<string, string> = {};
  for (const w of puzzle.words)
    for (const c of positions(w)) solution[c.key] = c.letter;
  const keys = Object.keys(solution);
  const last = keys.at(-1)!;
  let s = engine.start(key, "medio");
  s = engine.play(s, keys.slice(0, -1), "p")!.session;
  if (lose) s.scores.ai = 999;
  const tile = s.rack.find((id) => s.tiles[id].letter === solution[last])!;
  const word = puzzle.words.find((w) =>
    positions(w).some((c) => c.key === last),
  )!;
  s = engine.insert(s, word.id, tile, last);
  return { puzzle, engine, key, session: s, last, letter: solution[last] };
}
