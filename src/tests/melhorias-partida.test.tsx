import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";
import { levels } from "../data/catalog";
import { positions } from "../game/crossword-engine";
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
function open(patch: Partial<Player> = {}) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), ...patch },
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
const session = () => usePlayer.getState().player.sessions["vs:vila-1:medio"];
const confirmButton = () =>
  screen.getByRole("button", { name: /^(Confirmar|Passar a vez)$/ });

it("depois da vez do rival fica um resumo dela e as casas dele marcadas até o jogador confirmar", () => {
  vi.useFakeTimers();
  open({ tutorialDone: true });
  expect(document.querySelector(".last-move")).toBeNull();
  fireEvent.click(confirmButton());
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(session().versus.turn).toBe("p");
  const chip = screen.getByRole("button", { name: /^Última jogada: Sabi/ });
  expect(chip).toHaveTextContent(/^Sabi: /);
  const rivalCells = Object.entries(session().owners).filter(
    ([, o]) => o === "ai",
  ).length;
  expect(document.querySelectorAll(".cell.last-bot")).toHaveLength(rivalCells);
  // Tocar no resumo repete a frase completa e faz as casas piscarem.
  fireEvent.click(chip);
  expect(
    screen.getByText(/^Sabi (confirmou|tentou|passou)/),
  ).toBeInTheDocument();
  // Ao confirmar (ou passar) a jogada do jogador, o resumo some.
  fireEvent.click(confirmButton());
  expect(document.querySelector(".last-move")).toBeNull();
  expect(document.querySelector(".cell.last-bot")).toBeNull();
});

it("tutorial: só a peça que serve na casa azul brilha e o passo diz qual letra tocar", () => {
  open();
  const first = positions(levels[0].words[0])[0];
  const picks = document.querySelectorAll(".letter-bank .tutorial-pick");
  const fits = screen.queryAllByRole("button", {
    name: `Inserir letra ${first.letter}`,
  });
  const tip = screen.getByRole("note");
  if (fits.length) {
    expect(picks).toHaveLength(1);
    expect(fits).toContain(picks[0]);
    expect(tip).toHaveTextContent(`Toque no ${first.letter} que brilha`);
    fireEvent.click(picks[0]);
    expect(session().letters[first.key]).toBe(first.letter);
  } else {
    expect(picks).toHaveLength(0);
    expect(tip).toHaveTextContent("Toque numa letra do banco");
  }
});

it("alto contraste do Perfil vale na partida", () => {
  open({ tutorialDone: true, highContrast: true });
  expect(document.querySelector(".puzzle-page")).toHaveClass("high-contrast");
  cleanup();
  open({ tutorialDone: true });
  expect(document.querySelector(".puzzle-page")).not.toHaveClass(
    "high-contrast",
  );
});
