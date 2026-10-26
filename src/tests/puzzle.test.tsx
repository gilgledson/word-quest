import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { Layout } from "../components/Layout";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { PuzzleEngine, economy, positions } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const level = levels[0];
const solution: Record<string, string> = {};
for (const w of level.words)
  for (const c of positions(w)) solution[c.key] = c.letter;
const firstWord = level.words[0];
const [firstRow, firstCol] = positions(firstWord)[0].key.split(",").map(Number);

function mount(path = "/play/vila-1?vs=medio") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
function open(coins = initialPlayer.coins, path?: string) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), coins },
    ready: true,
  });
  mount(path);
}
const player = () => usePlayer.getState().player;
const session = (key = "vs:vila-1:medio") => player().sessions[key];
const rackButtons = () =>
  screen.queryAllByRole("button", { name: /^Inserir letra/ });
const rackLetters = () =>
  rackButtons().map((b) => b.getAttribute("aria-label")!.slice(-1));
const cell = (row: number, col: number, content: string) =>
  screen.getByRole("button", {
    name: `Linha ${row + 1}, coluna ${col + 1}: ${content}`,
  });
const confirmButton = () =>
  screen.getByRole("button", { name: /^(Confirmar|Passar a vez)$/ });
function dragTo(letter: string, target: Element | null, pointerType = "mouse") {
  const [tile] = screen.getAllByRole("button", {
    name: `Inserir letra ${letter}`,
  });
  vi.spyOn(document, "elementFromPoint").mockReturnValue(target);
  fireEvent.pointerDown(tile, {
    pointerId: 1,
    pointerType,
    button: 0,
    clientX: 50,
    clientY: 500,
  });
  fireEvent.pointerMove(tile, {
    pointerId: 1,
    pointerType,
    clientX: 100,
    clientY: 250,
  });
  fireEvent.pointerUp(tile, {
    pointerId: 1,
    pointerType,
    clientX: 100,
    clientY: 250,
  });
  return tile;
}
/** Coloca no tabuleiro todas as peças do banco que têm casa certa livre; devolve quantas. */
function placeCorrectTiles() {
  let placed = 0;
  for (let i = 0; i < 8; i++) {
    const letters = rackLetters();
    let target: [string, string] | undefined;
    let el: Element | null = null;
    for (const [k, l] of Object.entries(solution)) {
      if (!letters.includes(l)) continue;
      const [r, c] = k.split(",").map(Number);
      el = document.querySelector(
        `[aria-label="Linha ${r + 1}, coluna ${c + 1}: vazia"]`,
      );
      if (el) {
        target = [k, l];
        break;
      }
    }
    if (!target || !el) break;
    fireEvent.click(el);
    dragTo(target[1], el);
    placed++;
  }
  return placed;
}

it("mostra a grade fixa 8×10, densa, sem rolagem e sem barra de navegação", () => {
  render(
    <MemoryRouter initialEntries={["/play/vila-1"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="play/:id" element={<PuzzlePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
  const board = document.querySelector<HTMLElement>(".board")!;
  expect(board.querySelectorAll(".cell")).toHaveLength(80);
  expect(board.style.gridTemplateColumns).toContain("repeat(8");
  expect(board.style.gridTemplateRows).toContain("repeat(10");
  expect(board.querySelectorAll(".cell.blocked").length).toBeLessThanOrEqual(5);
  expect(board.querySelectorAll(".cell.clue.double").length).toBeGreaterThan(0);
  expect(document.querySelector(".board-scroll")).toBeNull();
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(rackButtons()).toHaveLength(5);
});
it("cada metade de uma pista dupla seleciona a sua própria palavra", () => {
  open();
  const double = document.querySelector(".cell.clue.double")!;
  const halves = [...double.querySelectorAll<HTMLElement>(".clue-half")];
  expect(halves).toHaveLength(2);
  expect(halves[0]).toHaveTextContent("→");
  expect(halves[1]).toHaveTextContent("↓");
  fireEvent.click(halves[1]);
  expect(halves[1]).toHaveClass("selected-clue");
  expect(halves[0]).not.toHaveClass("selected-clue");
  fireEvent.click(halves[0]);
  expect(halves[0]).toHaveClass("selected-clue");
});
it("as letras ficam pendentes até ✓, e ✓ devolve ao banco as erradas", () => {
  open();
  const [letter] = rackLetters();
  const wrongCell = positions(firstWord).find((c) => c.letter !== letter)!.key;
  const [r, c] = wrongCell.split(",").map(Number);
  const tile = dragTo(letter, cell(r, c, "vazia"));
  fireEvent.click(tile, { detail: 1 });
  expect(cell(r, c, letter)).toHaveClass("pending");
  expect(session().locked).toEqual([]);
  expect(rackButtons()).toHaveLength(4);
  fireEvent.click(confirmButton());
  expect(cell(r, c, "vazia")).toBeInTheDocument();
  expect(rackLetters()).toContain(letter);
  expect(session().scores.p).toBe(0);
  expect(screen.getByText(/Nenhuma letra certa/)).toBeInTheDocument();
});
it("letra errada confirmada custa 1 ponto, avisa na mensagem e não pinta nada de vermelho", () => {
  const key = "vs:vila-1:medio";
  const started = new PuzzleEngine(level).start(key, "medio");
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      sessions: { [key]: { ...started, scores: { p: 3, ai: 0 } } },
    },
    ready: true,
  });
  mount();
  const [letter] = rackLetters();
  const wrongCell = positions(firstWord).find((c) => c.letter !== letter)!.key;
  const [r, c] = wrongCell.split(",").map(Number);
  const tile = dragTo(letter, cell(r, c, "vazia"));
  fireEvent.click(tile, { detail: 1 });
  expect(document.querySelector(".incorrect, .word-error")).toBeNull();
  fireEvent.click(confirmButton());
  expect(document.querySelector(".incorrect, .word-error")).toBeNull();
  expect(session().scores.p).toBe(2);
  expect(screen.getByText(/−1 ponto por letra errada/)).toBeInTheDocument();
});
it("letras certas travam no ✓ e rendem pontos", () => {
  open();
  const placed = placeCorrectTiles();
  expect(placed).toBeGreaterThan(0);
  expect(session().locked).toEqual([]);
  fireEvent.click(confirmButton());
  expect(session().locked).toHaveLength(placed);
  expect(session().scores.p).toBeGreaterThanOrEqual(placed);
  expect(document.querySelectorAll(".cell.owner-p").length).toBe(placed);
});
it("tocar numa peça pendente a devolve ao banco, sem cobrar", () => {
  open();
  const before = rackLetters().sort();
  const [letter] = rackLetters();
  fireEvent.click(rackButtons()[0]);
  expect(rackButtons()).toHaveLength(4);
  fireEvent.click(cell(firstRow, firstCol, letter));
  expect(cell(firstRow, firstCol, "vazia")).toBeInTheDocument();
  expect(rackLetters().sort()).toEqual(before);
  expect(player().coins).toBe(100);
});
it("Dica custa 20 moedas, confirma a letra certa e registra a ajuda", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Dica" }));
  expect(player().coins).toBe(80);
  const hinted = session().locked[0];
  const [r, c] = hinted.split(",").map(Number);
  expect(cell(r, c, solution[hinted])).toBeInTheDocument();
  expect(session().scores.p).toBe(0);
});
it("Trocar mostra o custo total, cobra 10 por peça e mantém o banco", () => {
  open();
  const [first] = rackLetters();
  fireEvent.click(screen.getByRole("button", { name: "Trocar" }));
  const dialog = screen.getByRole("dialog", { name: "Trocar letras" });
  expect(dialog).toHaveTextContent("Custo: 0 moedas");
  fireEvent.click(
    screen.getAllByRole("button", { name: `Trocar letra ${first}` })[0],
  );
  expect(dialog).toHaveTextContent("Custo: 10 moedas");
  fireEvent.click(screen.getByRole("button", { name: "Confirmar troca" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(player().coins).toBe(90);
  expect(rackButtons()).toHaveLength(5);
});
it("cancelar a troca não cobra nada", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Trocar" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(player().coins).toBe(100);
});
it("o banco tem 5 peças e não há botões de + nem de Palavra", () => {
  open();
  expect(rackButtons()).toHaveLength(5);
  expect(screen.queryByRole("button", { name: "Adicionar letra" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Palavra" })).toBeNull();
  fireEvent.click(rackButtons()[0]);
  expect(rackButtons()).toHaveLength(4);
});
it("as peças só são repostas ao confirmar o turno", () => {
  open();
  const placed = placeCorrectTiles();
  expect(placed).toBeGreaterThan(0);
  expect(rackButtons().length).toBeLessThanOrEqual(5 - placed + 0);
  fireEvent.click(confirmButton());
  expect(rackButtons()).toHaveLength(5);
});
it("avisa e não cobra quando faltam moedas", () => {
  open(5);
  fireEvent.click(screen.getByRole("button", { name: "Dica" }));
  expect(screen.getByText(/Moedas insuficientes/)).toBeInTheDocument();
  expect(player().coins).toBe(5);
  expect(session()).toBeUndefined();
});
it("✓ sem peças pendentes vira Passar a vez", () => {
  open();
  expect(confirmButton()).toHaveAccessibleName("Passar a vez");
  fireEvent.click(rackButtons()[0]);
  expect(confirmButton()).toHaveAccessibleName("Confirmar");
});
it("a fase fixa o oponente: a fase 1 é contra o Bolota (fácil), sem escolha do jogador", () => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), botLevel: "dificil" },
    ready: true,
  });
  mount("/play/vila-1");
  expect(screen.getByText(/DUELO · FÁCIL/)).toBeInTheDocument();
  expect(screen.getByLabelText("Placar")).toHaveTextContent("Bolota");
});
it("retoma banco e letras pendentes ao reabrir a fase", () => {
  open();
  const [letter] = rackLetters();
  fireEvent.click(rackButtons()[0]);
  const after = rackLetters().sort();
  cleanup();
  mount();
  expect(cell(firstRow, firstCol, letter)).toHaveClass("pending");
  expect(rackLetters().sort()).toEqual(after);
});
it.each(["mouse", "touch"])(
  "solta uma letra na casa exata usando %s, sem inserir duas vezes",
  (pointerType) => {
    open();
    const [letter] = rackLetters();
    const cells = positions(firstWord);
    const [r, c] = cells[cells.length - 1].key.split(",").map(Number);
    const tile = dragTo(letter, cell(r, c, "vazia"), pointerType);
    // Browsers may emit a compatibility click after pointerup.
    fireEvent.click(tile, { detail: 1 });
    expect(cell(r, c, letter)).toBeInTheDocument();
    expect(Object.keys(session().letters)).toHaveLength(1);
    expect(rackButtons()).toHaveLength(4);
    fireEvent.click(cell(r, c, letter));
    expect(rackButtons()).toHaveLength(5);
    expect(cell(r, c, "vazia")).toBeInTheDocument();
  },
);
it("cancela solturas fora da grade, em pistas e em casas já confirmadas", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Dica" }));
  const locked = session().locked[0];
  const [lr, lc] = locked.split(",").map(Number);
  const before = structuredClone(session());
  for (const target of [
    null,
    screen.getAllByRole("button", { name: /^Pista:/ })[0],
    cell(lr, lc, solution[locked]),
  ]) {
    const tile = dragTo(rackLetters()[0], target);
    fireEvent.click(tile, { detail: 1 });
    expect(session()).toEqual(before);
    expect(document.querySelector(".drag-letter-ghost")).toBeNull();
  }
});
it("soltar numa casa de outra palavra seleciona essa palavra e coloca a letra", () => {
  open();
  // Casa que só pertence a uma palavra diferente da selecionada.
  const owners = (k: string) =>
    level.words.filter((w) => positions(w).some((c) => c.key === k));
  const key = Object.keys(solution).find((k) => {
    const [w, ...rest] = owners(k);
    return w && !rest.length && w.id !== firstWord.id;
  })!;
  const word = owners(key)[0];
  const [r, c] = key.split(",").map(Number);
  const [letter] = rackLetters();
  const tile = dragTo(letter, cell(r, c, "vazia"));
  fireEvent.click(tile, { detail: 1 });
  expect(cell(r, c, letter)).toHaveClass("pending");
  expect(rackButtons()).toHaveLength(4);
  const selected = document.querySelector(".clue-half.selected-clue");
  expect(selected).toHaveTextContent(word.clue);
});
it("soltar sobre uma letra pendente a substitui e devolve a antiga ao banco", () => {
  open();
  const letters = rackLetters();
  const first = letters[0];
  const second = letters.find((l) => l !== first)!;
  const cells = positions(firstWord);
  const [r, c] = cells[cells.length - 1].key.split(",").map(Number);
  dragTo(first, cell(r, c, "vazia"));
  expect(cell(r, c, first)).toBeInTheDocument();
  expect(rackButtons()).toHaveLength(4);
  dragTo(second, cell(r, c, first));
  expect(cell(r, c, second)).toHaveClass("pending");
  expect(rackButtons()).toHaveLength(4);
  expect(rackLetters()).toContain(first);
  expect(Object.keys(session().letters)).toHaveLength(1);
});
it("arrasta uma letra pendente para outra casa sem mexer no banco", () => {
  open();
  const [letter] = rackLetters();
  const cells = positions(firstWord).map((c) => c.key.split(",").map(Number));
  const [r1, c1] = cells[0];
  const [r2, c2] = cells[1];
  dragTo(letter, cell(r1, c1, "vazia"));
  expect(rackButtons()).toHaveLength(4);
  const from = cell(r1, c1, letter);
  vi.spyOn(document, "elementFromPoint").mockReturnValue(cell(r2, c2, "vazia"));
  fireEvent.pointerDown(from, {
    pointerId: 7,
    pointerType: "mouse",
    button: 0,
    clientX: 50,
    clientY: 50,
  });
  fireEvent.pointerMove(from, { pointerId: 7, clientX: 120, clientY: 90 });
  fireEvent.pointerUp(from, { pointerId: 7, clientX: 120, clientY: 90 });
  expect(cell(r2, c2, letter)).toHaveClass("pending");
  expect(cell(r1, c1, "vazia")).toBeInTheDocument();
  expect(rackButtons()).toHaveLength(4);
  expect(Object.keys(session().letters)).toHaveLength(1);
  // Tocar sem arrastar continua devolvendo a letra ao banco.
  fireEvent.click(cell(r2, c2, letter));
  expect(rackButtons()).toHaveLength(5);
});
it("cancela o gesto sem perder letras e continua permitindo toque", () => {
  open();
  const [letter] = rackLetters();
  const tile = rackButtons()[0];
  fireEvent.pointerDown(tile, {
    pointerId: 3,
    button: 0,
    clientX: 50,
    clientY: 500,
  });
  fireEvent.pointerMove(tile, { pointerId: 3, clientX: 100, clientY: 250 });
  fireEvent.pointerCancel(tile, { pointerId: 3 });
  expect(document.querySelector(".drag-letter-ghost")).not.toBeInTheDocument();
  expect(rackButtons()).toHaveLength(5);
  fireEvent.pointerDown(tile, {
    pointerId: 4,
    button: 0,
    clientX: 50,
    clientY: 500,
  });
  fireEvent.pointerUp(tile, { pointerId: 4, clientX: 50, clientY: 500 });
  fireEvent.click(tile);
  expect(cell(firstRow, firstCol, letter)).toBeInTheDocument();
});
it("mantém a ativação por teclado depois de cancelar um arraste", () => {
  open();
  const [letter] = rackLetters();
  const tile = rackButtons()[0];
  fireEvent.pointerDown(tile, {
    pointerId: 3,
    button: 0,
    clientX: 50,
    clientY: 500,
  });
  fireEvent.pointerMove(tile, { pointerId: 3, clientX: 100, clientY: 250 });
  fireEvent.pointerCancel(tile, { pointerId: 3 });
  fireEvent.click(tile, { detail: 0 });
  expect(cell(firstRow, firstCol, letter)).toBeInTheDocument();
});

it("versus: placar, ✓ passa a vez, o oponente joga depois do atraso e devolve a vez", () => {
  vi.useFakeTimers();
  open(100, "/play/vila-1?vs=medio");
  expect(screen.getByText("DUELO · MÉDIO")).toBeInTheDocument();
  expect(screen.getByLabelText("Placar")).toHaveTextContent("Explorador0");
  expect(confirmButton()).toHaveAccessibleName("Passar a vez");
  fireEvent.click(confirmButton());
  expect(session().versus?.turn).toBe("ai");
  expect(screen.getByText("Sabi pensando…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dica" })).toBeDisabled();
  expect(rackButtons().every((b) => (b as HTMLButtonElement).disabled)).toBe(
    true,
  );
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(session().versus?.turn).toBe("p");
  expect(session().versus?.rngCount).toBe(1);
  expect(screen.queryByText("Sabi pensando…")).toBeNull();
  expect(screen.getByRole("button", { name: "Dica" })).toBeEnabled();
});
it("versus com zero moedas: partida inteira, pontuação, recompensa única e persistência", () => {
  vi.useFakeTimers();
  open(0, "/play/vila-1?vs=dificil");
  for (let i = 0; i < 300; i++) {
    if (screen.queryByText(/Você venceu|Empate!|venceu/)) break;
    placeCorrectTiles();
    fireEvent.click(confirmButton());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
  const done = session("vs:vila-1:dificil");
  expect(screen.getByText(/Você venceu|Empate!|venceu/)).toBeInTheDocument();
  expect(done.claimed).toBe(true);
  const result = player().duels["vs:vila-1:dificil"];
  expect(["win", "draw", "loss"]).toContain(result);
  expect(player().coins).toBe(economy.duel[result]);
  // Vencer o duelo conclui a fase (estrelas pela dificuldade); empate ou derrota não.
  expect(player().stars["vila-1"]).toBe(
    result === "win" ? economy.duelStars.dificil : undefined,
  );
  expect(done.scores.p + done.scores.ai).toBeGreaterThan(0);
  // Recarregar não paga de novo nem muda o resultado.
  cleanup();
  mount("/play/vila-1?vs=dificil");
  expect(player().coins).toBe(economy.duel[result]);
}, 120_000);

it("gira só o tabuleiro: 10×8, setas viradas e o resto da tela igual", () => {
  open();
  const board = document.querySelector<HTMLElement>(".board")!;
  expect(board.style.gridTemplateColumns).toContain("repeat(8");
  const turn = screen.getByRole("button", { name: "Girar tabuleiro" });
  expect(turn).toHaveAttribute("aria-pressed", "false");
  const [r, c] = positions(firstWord)[0].key.split(",").map(Number);
  const label = `Linha ${r + 1}, coluna ${c + 1}: vazia`;
  fireEvent.click(turn);
  expect(turn).toHaveAttribute("aria-pressed", "true");
  expect(board.style.gridTemplateColumns).toContain("repeat(10");
  expect(board.style.gridTemplateRows).toContain("repeat(8");
  // Um quarto de volta anti-horário: (linha, coluna) vai para (colunas − coluna, linha + 1).
  const el = screen.getByLabelText(label);
  expect(el.style.gridRow).toBe(String(level.cols - c));
  expect(el.style.gridColumn).toBe(String(r + 1));
  const arrows = [...document.querySelectorAll(".clue-half b")].map(
    (b) => b.textContent,
  );
  expect(arrows).toContain("↑");
  expect(arrows).not.toContain("↓");
  // O restante do jogo não muda: banco, ações e jogo continuam iguais.
  expect(rackButtons()).toHaveLength(5);
  expect(screen.getByRole("button", { name: "Dica" })).toBeInTheDocument();
  fireEvent.click(rackButtons()[0]);
  expect(Object.keys(session().letters)).toHaveLength(1);
  // A escolha fica salva.
  cleanup();
  mount();
  expect(
    document.querySelector<HTMLElement>(".board")!.style.gridTemplateColumns,
  ).toContain("repeat(10");
  fireEvent.click(screen.getByRole("button", { name: "Girar tabuleiro" }));
  expect(
    document.querySelector<HTMLElement>(".board")!.style.gridTemplateColumns,
  ).toContain("repeat(8");
});

it("mostra '+N' animado sobre as casas que pontuaram e o brilho nelas, e some depois", () => {
  vi.useFakeTimers();
  open();
  const placed = placeCorrectTiles();
  expect(placed).toBeGreaterThan(0);
  expect(document.querySelector(".score-float")).toBeNull();
  fireEvent.click(confirmButton());
  const floats = [...document.querySelectorAll(".score-float")];
  expect(floats.length).toBeGreaterThan(0);
  expect(floats[0]).toHaveTextContent(`+${placed}`);
  expect(floats[0]).toHaveClass("p");
  expect(document.querySelectorAll(".cell.flash")).toHaveLength(placed);
  expect(screen.getByLabelText("Placar")).toHaveTextContent(
    `Explorador${session().scores.p}`,
  );
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  // A vez do oponente começa em 900 ms; só as animações do jogador devem ter sumido.
  expect(document.querySelector(".score-float.p")).toBeNull();
  expect(document.querySelector(".score-float.bonus")).toBeNull();
});
it("sem animações não há '+N' flutuante (a mensagem continua avisando os pontos)", () => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), animations: false },
    ready: true,
  });
  mount();
  placeCorrectTiles();
  fireEvent.click(confirmButton());
  expect(document.querySelector(".score-float")).toBeNull();
  expect(screen.getByText(/^\+\d+ pontos?/)).toBeInTheDocument();
});
