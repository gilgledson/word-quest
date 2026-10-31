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
  wordsFoundCount,
  wordsToNextChest,
} from "../game/chest";
import { economy } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Jogador com `words` palavras descobertas (espalhadas em fases fictícias). */
const found = (words: number) =>
  Object.fromEntries(
    Array.from({ length: Math.ceil(words / 10) }, (_, i) => [
      `fase-${i}`,
      Array.from(
        { length: Math.min(10, words - i * 10) },
        (_, j) => `p${i}-${j}`,
      ),
    ]),
  );
const open = (words: number, patch = {}) => {
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      wordsFound: found(words),
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
  it("um baú a cada 25 palavras, com prêmio crescente que se repete no fim", () => {
    expect(economy.chest).toEqual([50, 75, 100, 125, 150]);
    expect(economy.chestWords).toBe(25);
    expect([0, 24, 25, 49, 50, 125, 250].map(chestsEarned)).toEqual([
      0, 0, 1, 1, 2, 5, 10,
    ]);
    expect(chestsReady(50, 1)).toBe(1);
    expect(chestsReady(50, 2)).toBe(0);
    expect(chestsReady(10, 5)).toBe(0);
    expect([0, 1, 2, 3, 4, 5, 9].map(chestPrize)).toEqual([
      50, 75, 100, 125, 150, 150, 150,
    ]);
  });
  it("palavras que faltam para o próximo baú", () => {
    expect(wordsToNextChest(0, 0)).toBe(25);
    expect(wordsToNextChest(20, 0)).toBe(5);
    expect(wordsToNextChest(25, 0)).toBe(0); // já há um pronto
    expect(wordsToNextChest(30, 1)).toBe(20);
  });
  it("soma as palavras de cada fase uma vez só", () => {
    expect(wordsFoundCount(undefined)).toBe(0);
    expect(wordsFoundCount({ a: ["1", "2"], b: ["3"] })).toBe(3);
  });
});

describe("baú na tela inicial", () => {
  it("fechado enquanto faltam palavras, com a contagem", () => {
    open(20);
    expect(chestButton()).toBeDisabled();
    expect(screen.getByText("Baú em 5 palavras")).toBeInTheDocument();
  });
  it("com 25 palavras o baú fica pronto; tocar abre, paga as moedas e conta uma abertura", () => {
    open(25);
    expect(screen.getByText("Baú pronto! Toque nele")).toBeInTheDocument();
    expect(chestButton()).toBeEnabled();
    expect(chestButton()).toHaveAccessibleName("Abrir baú: 50 moedas");
    const before = player().coins;
    fireEvent.click(chestButton());
    const dialog = screen.getByRole("dialog", { name: "Baú aberto" });
    expect(dialog).toHaveTextContent("+50 moedas");
    expect(player().coins).toBe(before + 50);
    expect(player().chestsOpened).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chestButton()).toBeDisabled();
    expect(screen.getByText("Baú em 25 palavras")).toBeInTheDocument();
  });
  it("não paga duas vezes: o baú aberto não abre de novo", () => {
    open(25);
    fireEvent.click(chestButton());
    const coins = player().coins;
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(chestButton()).toBeDisabled();
    fireEvent.click(chestButton());
    expect(player().coins).toBe(coins);
    expect(player().chestsOpened).toBe(1);
  });
  it("o prêmio cresce a cada baú: o segundo vale 75 moedas", () => {
    open(50, { chestsOpened: 1 });
    expect(chestButton()).toHaveAccessibleName("Abrir baú: 75 moedas");
    const before = player().coins;
    fireEvent.click(chestButton());
    expect(player().coins).toBe(before + 75);
    expect(player().chestsOpened).toBe(2);
  });
  it("vários baús prontos: mostra a quantidade e abre um por vez", () => {
    open(50);
    expect(screen.getByText("2 baús prontos!")).toBeInTheDocument();
    fireEvent.click(chestButton());
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(player().chestsOpened).toBe(1);
    expect(chestButton()).toBeEnabled();
    expect(screen.getByText("Baú pronto! Toque nele")).toBeInTheDocument();
  });
  it("depois do quinto baú o prêmio segue em 150 e os baús continuam", () => {
    open(150, { chestsOpened: 5 });
    expect(chestButton()).toHaveAccessibleName("Abrir baú: 150 moedas");
    act(() => void fireEvent.click(chestButton()));
    expect(player().chestsOpened).toBe(6);
  });
  it("saves antigos, sem o contador de baús, começam com zero abertos", () => {
    const antigo = { ...structuredClone(initialPlayer) } as Partial<
      typeof initialPlayer
    >;
    delete antigo.chestsOpened;
    usePlayer.setState({
      player: { ...(antigo as typeof initialPlayer), wordsFound: found(25) },
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
