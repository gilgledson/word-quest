import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { economy } from "../../game/crossword-engine";
import { finishScenario, load, mountWithLayout } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const confirmBtn = () =>
  screen.getByRole("button", {
    name: /^(Confirmar \d+ letras?|Passar a vez)$/,
  });
const sheet = () =>
  screen.queryByRole("region", { name: "Resultado da partida" });
const handle = () =>
  sheet()!.querySelector<HTMLButtonElement>(".result-sheet-handle")!;

function finish(lose = false, patch = {}) {
  const sc = finishScenario(lose);
  load(sc.key, sc.session, patch);
  mountWithLayout(sc.puzzle.id);
  fireEvent.click(confirmBtn());
  return sc;
}

describe("Cartão de resultado (bottom sheet)", () => {
  it("vitória: sobe aberto ao terminar, com título, placar, moedas e a próxima fase", () => {
    finish();
    const card = sheet()!;
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("Você venceu!");
    expect(card).toHaveTextContent(`+${economy.duel.win} moedas`);
    expect(within(card).getByLabelText("Placar final")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: /^Próxima fase/ }),
    ).toHaveAttribute("href", expect.stringContaining("/play/vila-2"));
    // A melhor palavra do jogador aparece em peças.
    expect(card).toHaveTextContent("Melhor palavra");
  });
  it("derrota: diz quem venceu e quantas moedas saíram, sem próxima fase", () => {
    finish(true);
    const card = sheet()!;
    expect(
      within(card).getByRole("heading", { name: /venceu$/ }),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent(`−${-economy.duel.loss} moedas`);
    expect(
      within(card).queryByRole("link", { name: /Próxima fase/ }),
    ).toBeNull();
    expect(
      within(card).getByRole("button", { name: /Revanche/ }),
    ).toBeInTheDocument();
  });
  it("'Ver tabuleiro' recolhe numa faixa com o placar; tocar nela abre de novo", () => {
    finish();
    expect(handle()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /Ver tabuleiro/ }));
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    // Recolhido: só a faixa (resultado e placar), sem os botões.
    expect(sheet()).toHaveTextContent("Você venceu!");
    expect(
      within(sheet()!).queryByRole("link", { name: /Próxima fase/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ver resultado/ }));
    expect(handle()).toHaveAttribute("aria-expanded", "true");
  });
  it("reabrir uma partida já terminada mostra o cartão de novo", () => {
    const sc = finish();
    act(() => void vi.advanceTimersByTime(3000));
    cleanup();
    mountWithLayout(sc.puzzle.id);
    expect(sheet()).toHaveTextContent("Você venceu!");
    expect(handle()).toHaveAttribute("aria-expanded", "true");
  });
  it("com animações desligadas o cartão aparece direto, sem subir", () => {
    finish(false, { animations: false });
    expect(sheet()!.style.transform).not.toContain("100%");
  });
  it("o foco vai para o cartão (o leitor de tela anuncia o resultado)", () => {
    finish(true);
    expect(document.activeElement).toBe(sheet());
  });
});
