import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
import { levels } from "../data/catalog";
import { positions } from "../game/crossword-engine";
import { initialPlayer, repository } from "../services/repository";
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
  vi.restoreAllMocks();
});
const word = levels[0].words[0];
const open = (tutorialDone: boolean, path = "/play/vila-1?vs=medio") => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), tutorialDone },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
};
const rackButtons = () =>
  screen.getAllByRole("button", { name: /^Inserir letra/ });
const cellAt = (key: string, content: string) => {
  const [r, c] = key.split(",").map(Number);
  return screen.getByRole("button", {
    name: `Linha ${r + 1}, coluna ${c + 1}: ${content}`,
  });
};

describe("seleção assistida da grade", () => {
  it("a peça entra na casa tocada, não na primeira vazia da palavra", () => {
    open(true);
    const cells = positions(word);
    fireEvent.click(cellAt(cells[2].key, "vazia"));
    const tile = rackButtons()[0];
    const letter = tile.getAttribute("aria-label")!.slice(-1);
    fireEvent.click(tile);
    expect(cellAt(cells[2].key, letter)).toHaveClass("pending");
    expect(cellAt(cells[0].key, "vazia")).toBeInTheDocument();
  });
  it("sem tocar numa casa, a peça continua indo para a primeira vazia", () => {
    open(true);
    const cells = positions(word);
    const tile = rackButtons()[0];
    const letter = tile.getAttribute("aria-label")!.slice(-1);
    fireEvent.click(tile);
    expect(cellAt(cells[0].key, letter)).toHaveClass("pending");
  });
});

describe("estados da grade sem depender de cor", () => {
  it("letra pendente e letra confirmada têm marcas próprias (pending e <i>)", () => {
    open(true);
    const cells = positions(word);
    fireEvent.click(rackButtons()[0]);
    const pending = document.querySelector(".cell.pending");
    expect(pending).not.toBeNull();
    // A palavra ativa recebe a barra (classe active) e a pendente não tem <i> de confirmada.
    expect(document.querySelectorAll(".cell.active").length).toBe(cells.length);
    expect(pending!.querySelector("i")).toBeNull();
  });
});

describe("tutorial da fase 1", () => {
  it("acompanha em 4 passos: depois do rival, explica que a vez voltou", () => {
    vi.useFakeTimers();
    open(false);
    expect(screen.getByRole("note")).toHaveTextContent("1/4");
    expect(document.querySelector("[data-tutorial='1']")).not.toBeNull();
    fireEvent.click(rackButtons()[0]);
    expect(screen.getByRole("note")).toHaveTextContent("2/4");
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar/ }));
    expect(screen.getByRole("note")).toHaveTextContent("3/4");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // A vez voltou: o último passo fica até o "Entendi" (ou a próxima letra).
    expect(usePlayer.getState().player.tutorialDone).toBe(false);
    expect(screen.getByRole("note")).toHaveTextContent(
      "4/4Sua vez de novo: mais pontos vence",
    );
    fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
    expect(usePlayer.getState().player.tutorialDone).toBe(true);
    expect(screen.queryByRole("note")).toBeNull();
  });
  it("colocar a próxima letra depois do rival também encerra o tutorial", () => {
    vi.useFakeTimers();
    open(false);
    fireEvent.click(rackButtons()[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar/ }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("note")).toHaveTextContent("4/4");
    fireEvent.click(rackButtons()[0]);
    expect(usePlayer.getState().player.tutorialDone).toBe(true);
  });
  it("Pular encerra o tutorial e grava a preferência", async () => {
    open(false);
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(usePlayer.getState().player.tutorialDone).toBe(true);
    expect(screen.queryByRole("note")).toBeNull();
    await vi.waitFor(() => expect(repository.save).toHaveBeenCalled());
  });
  it.each(["/play/vila-2?vs=medio", "/play/daily?vs=medio"])(
    "não aparece fora da fase 1 (%s)",
    (path) => {
      open(false, path);
      expect(screen.queryByRole("note")).toBeNull();
    },
  );
  it("quem já tinha progresso salvo antes do tutorial não o vê; jogador novo vê", async () => {
    const { tutorialDone: _omit, ...old } = structuredClone(initialPlayer);
    void _omit;
    vi.mocked(repository.load).mockResolvedValueOnce(
      old as typeof initialPlayer,
    );
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.tutorialDone).toBe(true);
    vi.mocked(repository.load).mockResolvedValueOnce(undefined);
    await usePlayer.getState().hydrate();
    expect(usePlayer.getState().player.tutorialDone).toBe(false);
  });
});
