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
function open(coins = 100) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), coins, tutorialDone: true },
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
    const note = screen.getByText("Uma ajudinha para seguir em frente.");
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
    open(1000);
    for (let i = 0; i < 6; i++)
      fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(progress()).toHaveTextContent("6/7 · resta 1 · +7 ao completar");
  });
  it("palavra fechada mostra 'Palavra completa'", () => {
    vi.useFakeTimers();
    open(1000);
    for (let i = 0; i < 7; i++)
      fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(progress()).toHaveTextContent("Palavra completa ✓");
  });
});
