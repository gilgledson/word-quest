import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { PuzzleEngine, positions } from "../game/crossword-engine";
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
  vi.useRealTimers();
});
/** Abre a fase 1 já com as primeiras `locked` casas da primeira palavra confirmadas. */
function open(coins = 100, locked = 0) {
  const sessions: Record<string, unknown> = {};
  if (locked) {
    const engine = new PuzzleEngine(levels[0]);
    const s = engine.start("vs:vila-1:medio", "medio");
    for (const c of positions(levels[0].words[0]).slice(0, locked))
      engine.rack.lockCell(s, c.key, "p");
    sessions["vs:vila-1:medio"] = s;
  }
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      coins,
      tutorialDone: true,
      sessions,
    } as typeof initialPlayer,
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const progress = () => screen.queryByTestId("word-progress");

describe("Painel da palavra: progresso e valor de fechar", () => {
  it("mostra letras preenchidas, quantas faltam e o que fechar vale", () => {
    open();
    expect(progress()).toHaveTextContent("0/7 · restam 7 · +7 ao completar");
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    expect(progress()).toHaveTextContent("1/7 · restam 6 · +7 ao completar");
  });
  it("a frase fixa de rotina deixa de aparecer, mas segue para o leitor de tela", () => {
    open();
    const hint = screen.getByText(/Arraste as letras até as casas/);
    expect(hint).toHaveClass("message-hidden");
    expect(hint).toHaveAttribute("aria-live", "polite");
  });
  it("avisos de resultado aparecem por um tempo e depois voltam ao progresso", () => {
    vi.useFakeTimers();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    const note = screen.getByText(/^Dica colocou uma letra sua/);
    expect(note).not.toHaveClass("message-hidden");
    expect(progress()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4600);
    });
    expect(note).toHaveClass("message-hidden");
    expect(progress()).toHaveTextContent("1/7 · restam 6 · +7 ao completar");
  });
  it("depois de um aviso de resultado, uma jogada de rotina traz o progresso de volta na hora", () => {
    vi.useFakeTimers();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    expect(progress()).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra/ })[0],
    );
    expect(progress()).toHaveTextContent("2/7 · restam 5 · +7 ao completar");
  });
  it("com todas as casas cheias e ainda não confirmadas, pede a confirmação", () => {
    vi.useFakeTimers();
    open(1000, 6);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(progress()).toHaveTextContent("6/7 · resta 1 · +7 ao completar");
  });
  it("palavra fechada mostra 'Palavra completa'", () => {
    vi.useFakeTimers();
    open(1000, 7);
    // Ao fechar a palavra o painel passa para a próxima; voltar a ela mostra o aviso.
    const first = positions(levels[0].words[0])[0].key;
    fireEvent.click(document.querySelector(`[data-cell="${first}"]`)!);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(progress()).toHaveTextContent("Palavra completa ✓");
  });
});

describe("Vez do rival: controles desligados e pista escolhida", () => {
  const pass = () =>
    fireEvent.click(screen.getByRole("button", { name: "Passar a vez" }));
  const clues = () => screen.getAllByRole("button", { name: /^Pista:/ });
  const clueText = (el: HTMLElement) =>
    el
      .getAttribute("aria-label")!
      .replace(/^Pista: /, "")
      .replace(/, (horizontal|vertical)$/, "");

  it("Trocar, Dica e Confirmar ficam desabilitados enquanto o rival joga", () => {
    vi.useFakeTimers();
    open();
    pass();
    for (const name of ["Trocar", "Dica", "Passar a vez"]) {
      const b = screen.getByRole("button", { name });
      expect(b, name).toBeDisabled();
    }
    for (const t of screen.getAllByRole("button", { name: /^Inserir letra/ }))
      expect(t).toBeDisabled();
  });
  it("tocar numa pista na vez do rival mostra 'Sua pista' no painel e destaca a palavra", () => {
    vi.useFakeTimers();
    open();
    pass();
    const target = clues()[3];
    fireEvent.click(target);
    expect(target).toHaveClass("selected-clue");
    expect(progress()).toHaveTextContent(`Sua pista: ${clueText(target)}`);
    expect(document.querySelectorAll(".cell.active").length).toBeGreaterThan(0);
  });
  it("sem escolher pista, o painel segue mostrando o último aviso; ao voltar a vez, o progresso normal", () => {
    vi.useFakeTimers();
    open();
    pass();
    expect(progress()).toBeNull();
    fireEvent.click(clues()[3]);
    expect(progress()).toHaveTextContent("Sua pista:");
    // O rival joga (até uns 3 s); só depois o aviso do resultado dele passa a contar 4,5 s.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("button", { name: "Dica" })).toBeEnabled();
    expect(progress()).not.toHaveTextContent("Sua pista:");
    expect(progress()).toHaveTextContent(/\d+\/\d+ · /);
  });
});
