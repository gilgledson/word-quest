import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { economy } from "../../game/crossword-engine";
import { finishScenario, load, mountWithLayout } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const confirmBtn = () =>
  screen.getByRole("button", { name: /^(Confirmar|Passar a vez)$/ });
const popup = () =>
  screen.queryByRole("dialog", { name: "Resultado da partida" });

function finish(lose = false, patch = {}) {
  const sc = finishScenario(lose);
  load(sc.key, sc.session, patch);
  mountWithLayout(sc.puzzle.id);
  fireEvent.click(confirmBtn());
  return sc;
}

describe("Janela de resultado do duelo", () => {
  it("vitória: abre ao terminar, com título, placar, moedas e a próxima fase", () => {
    const sc = finish();
    const dialog = popup()!;
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Vitória!");
    expect(dialog).toHaveTextContent(`+${economy.duel.win} moedas`);
    expect(screen.getByLabelText("Placar final")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima fase" })).toHaveAttribute(
      "href",
      expect.stringContaining("/play/vila-2"),
    );
    void sc;
  });
  it("derrota: mostra que perdeu, com a recompensa menor, sem próxima fase", () => {
    finish(true);
    const dialog = popup()!;
    expect(dialog).toHaveTextContent("Derrota");
    expect(dialog).toHaveTextContent(`+${economy.duel.loss} moedas`);
    expect(screen.queryByRole("link", { name: "Próxima fase" })).toBeNull();
  });
  it("fecha pelo botão, pelo Esc e tocando fora; o painel de resultado continua na tela", () => {
    finish();
    fireEvent.click(screen.getByRole("button", { name: "Ver o tabuleiro" }));
    expect(popup()).toBeNull();
    expect(screen.getByText("Você venceu o duelo!")).toBeInTheDocument();
    cleanup();
    finish();
    fireEvent.keyDown(screen.getByTestId("result-popup"), { key: "Escape" });
    expect(popup()).toBeNull();
    cleanup();
    finish();
    fireEvent.click(screen.getByTestId("result-popup"));
    expect(popup()).toBeNull();
    // Tocar dentro da janela não fecha.
    cleanup();
    finish();
    fireEvent.click(popup()!);
    expect(popup()).toBeInTheDocument();
  });
  it("reabrir uma partida já terminada não abre a janela de novo", () => {
    const sc = finish();
    act(() => void vi.advanceTimersByTime(3000));
    cleanup();
    mountWithLayout(sc.puzzle.id);
    expect(popup()).toBeNull();
    expect(screen.getByText("Você venceu o duelo!")).toBeInTheDocument();
  });
  it("com animações desligadas a janela aparece direto, sem fade", () => {
    finish(false, { animations: false });
    const backdrop = screen.getByTestId("result-popup");
    expect(backdrop.style.opacity).not.toBe("0");
    expect(popup()).toBeInTheDocument();
  });
  it("o foco vai para o botão de fechar", () => {
    finish(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Continuar" }),
    );
  });
});
