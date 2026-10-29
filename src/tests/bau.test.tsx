import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "../features/pages";
import {
  chestPrize,
  chestsEarned,
  chestsReady,
  winsToNextChest,
} from "../game/chest";
import { economy } from "../game/crossword-engine";
import { levels } from "../data/catalog";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Jogador com `wins` fases concluídas (as primeiras da campanha). */
const open = (wins: number, patch = {}) => {
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      stars: Object.fromEntries(levels.slice(0, wins).map((l) => [l.id, 1])),
      ...patch,
    },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
};
const chestButton = () =>
  screen.getByRole("button", { name: /^(Abrir baú|Baú fechado)/ });
const player = () => usePlayer.getState().player;

describe("regras do baú", () => {
  it("um baú a cada 5 vitórias, até 5 baús, com prêmio fixo e crescente", () => {
    expect(economy.chest).toEqual([50, 75, 100, 125, 150]);
    expect(economy.chestEvery).toBe(5);
    expect([0, 4, 5, 9, 10, 24, 25].map(chestsEarned)).toEqual([
      0, 0, 1, 1, 2, 4, 5,
    ]);
    expect(chestsReady(10, 1)).toBe(1);
    expect(chestsReady(10, 2)).toBe(0);
    expect(chestsReady(3, 5)).toBe(0);
    expect([0, 1, 2, 3, 4].map(chestPrize)).toEqual([50, 75, 100, 125, 150]);
  });
  it("vitórias que faltam para o próximo baú", () => {
    expect(winsToNextChest(0, 0)).toBe(5);
    expect(winsToNextChest(3, 0)).toBe(2);
    expect(winsToNextChest(5, 0)).toBe(0); // já há um pronto
    expect(winsToNextChest(7, 1)).toBe(3);
    expect(winsToNextChest(25, 5)).toBeNull(); // todos abertos
  });
});

describe("baú na tela inicial", () => {
  it("fechado enquanto faltam vitórias, com a contagem", () => {
    open(3);
    expect(chestButton()).toBeDisabled();
    expect(screen.getByText("Baú em 2 vitórias")).toBeInTheDocument();
  });
  it("com 5 vitórias o baú fica pronto; tocar abre, paga as moedas e conta uma abertura", () => {
    open(5);
    expect(screen.getByText("Baú pronto! Toque nele")).toBeInTheDocument();
    expect(chestButton()).toBeEnabled();
    expect(chestButton()).toHaveAccessibleName("Abrir baú: 50 moedas");
    const before = player().coins;
    fireEvent.click(chestButton());
    const dialog = screen.getByRole("dialog", { name: "Baú aberto" });
    expect(dialog).toHaveTextContent("Baú aberto!");
    expect(dialog).toHaveTextContent("+50 moedas");
    expect(player().coins).toBe(before + 50);
    expect(player().chestsOpened).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Depois de aberto, o baú fecha de novo até as próximas 5 vitórias.
    expect(chestButton()).toBeDisabled();
    expect(screen.getByText("Baú em 5 vitórias")).toBeInTheDocument();
  });
  it("não paga duas vezes: o baú aberto não abre de novo", () => {
    open(5);
    fireEvent.click(chestButton());
    const coins = player().coins;
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(chestButton()).toBeDisabled();
    fireEvent.click(chestButton());
    expect(player().coins).toBe(coins);
    expect(player().chestsOpened).toBe(1);
  });
  it("o prêmio cresce a cada baú: o segundo vale 75 moedas", () => {
    open(10, { chestsOpened: 1 });
    expect(chestButton()).toHaveAccessibleName("Abrir baú: 75 moedas");
    const before = player().coins;
    fireEvent.click(chestButton());
    expect(player().coins).toBe(before + 75);
    expect(player().chestsOpened).toBe(2);
  });
  it("vários baús prontos: mostra a quantidade e abre um por vez", () => {
    open(10);
    expect(screen.getByText("2 baús prontos!")).toBeInTheDocument();
    fireEvent.click(chestButton());
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(player().chestsOpened).toBe(1);
    expect(chestButton()).toBeEnabled();
    expect(screen.getByText("Baú pronto! Toque nele")).toBeInTheDocument();
  });
  it("com os 5 baús abertos, avisa que acabaram", () => {
    open(25, { chestsOpened: 5 });
    expect(screen.getByText("Todos os baús abertos")).toBeInTheDocument();
    expect(chestButton()).toBeDisabled();
  });
  it("saves antigos, sem o contador de baús, começam com zero abertos", () => {
    const antigo = { ...structuredClone(initialPlayer) } as Partial<
      typeof initialPlayer
    >;
    delete antigo.chestsOpened;
    usePlayer.setState({
      player: {
        ...(antigo as typeof initialPlayer),
        stars: Object.fromEntries(levels.slice(0, 5).map((l) => [l.id, 1])),
      },
      ready: true,
    });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(chestButton()).toBeEnabled();
    act(() => void fireEvent.click(chestButton()));
    expect(player().chestsOpened).toBe(1);
  });
});
