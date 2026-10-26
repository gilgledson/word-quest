import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../components/Layout";
import { economy } from "../../game/crossword-engine";
import { initialPlayer } from "../../services/repository";
import { usePlayer } from "../../stores/player";
import {
  crossScenario,
  finishScenario,
  load,
  mountWithLayout,
} from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // @ts-expect-error limpeza do mock de matchMedia dos testes
  delete window.matchMedia;
});

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const confirmBtn = () =>
  screen.getByRole("button", { name: /^(Confirmar|Passar a vez)$/ });
const coinsNow = () => usePlayer.getState().player.coins;

/** Joga a última letra e confirma: a partida termina e a recompensa é paga. */
function finish(opts: { lose?: boolean; patch?: object } = {}) {
  const sc = finishScenario(opts.lose);
  load(sc.key, sc.session, opts.patch);
  mountWithLayout(sc.puzzle.id);
  fireEvent.click(confirmBtn());
  return sc;
}

describe("Moedas da recompensa", () => {
  it("vitória: moedas voam até o saldo, +N aparece e o saldo é creditado uma só vez", () => {
    const start = initialPlayer.coins;
    finish();
    expect(coinsNow()).toBe(start + economy.duel.win);
    expect(screen.getAllByTestId("fx-coin")).toHaveLength(7);
    expect(screen.getByTestId("fx-coin-amount")).toHaveTextContent(
      `+${economy.duel.win}`,
    );
    advance(500);
    expect(document.querySelector(".wallet")).toHaveClass("fx-wallet-pulse");
    advance(2500);
    expect(screen.queryAllByTestId("fx-coin")).toHaveLength(0);
    expect(document.querySelector(".wallet")).not.toHaveClass(
      "fx-wallet-pulse",
    );
    expect(coinsNow()).toBe(start + economy.duel.win);
  });
  it("remontar a partida concluída não repete a animação nem credita de novo", () => {
    const start = initialPlayer.coins;
    const sc = finish();
    advance(3000);
    cleanup();
    mountWithLayout(sc.puzzle.id);
    expect(screen.queryAllByTestId("fx-coin")).toHaveLength(0);
    expect(screen.queryByTestId("fx-coin-amount")).toBeNull();
    expect(coinsNow()).toBe(start + economy.duel.win);
  });
  it("derrota também paga a recompensa menor, sem onda nem selo de fase concluída", () => {
    const start = initialPlayer.coins;
    finish({ lose: true });
    expect(coinsNow()).toBe(start + economy.duel.loss);
    expect(screen.getByTestId("fx-coin-amount")).toHaveTextContent(
      `+${economy.duel.loss}`,
    );
    expect(screen.queryByTestId("fx-wave")).toBeNull();
    expect(screen.queryByText("Fase concluída!")).toBeNull();
    expect(screen.getByText("Sabi venceu")).toBeInTheDocument();
  });
  it("movimento reduzido: sem moedas voando, só o +N discreto", () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    finish();
    expect(screen.queryAllByTestId("fx-coin")).toHaveLength(0);
    expect(screen.getByTestId("fx-coin-amount")).toHaveClass("reduced");
  });
  it("animações desligadas: o saldo é o mesmo e nenhum efeito aparece", () => {
    const start = initialPlayer.coins;
    finish({ patch: { animations: false } });
    expect(coinsNow()).toBe(start + economy.duel.win);
    expect(screen.queryAllByTestId("fx-coin")).toHaveLength(0);
    expect(screen.queryByTestId("fx-wave")).toBeNull();
    // O resultado e o botão de continuar funcionam normalmente.
    expect(screen.getByText("Você venceu o duelo!")).toBeInTheDocument();
  });
});

describe("Conclusão da fase", () => {
  it("vitória: selo, estrelas em sequência, onda no tabuleiro e botão utilizável desde o início", () => {
    finish();
    expect(screen.getByText("Fase concluída!")).toBeInTheDocument();
    expect(
      screen.getByLabelText(`${economy.duelStars.medio} estrelas`),
    ).toBeInTheDocument();
    expect(screen.getByTestId("fx-wave")).toBeInTheDocument();
    // Os efeitos ainda estão rodando, mas a tela de resultado já responde.
    const again = screen.getByRole("button", { name: "Jogar novamente" });
    expect(again).toBeEnabled();
    fireEvent.click(again);
    expect(screen.queryByText("Você venceu o duelo!")).toBeNull();
  });
  it("a onda some sozinha depois de ~1,3 s", () => {
    finish();
    advance(2000);
    expect(screen.queryByTestId("fx-wave")).toBeNull();
  });
});

describe("Transições de tela e modal", () => {
  const renderLayout = (path: string, animations = true) => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), animations },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>início</p>} />
            <Route path="map" element={<p>mapa</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    return document.querySelector("main")!;
  };
  it("a tela entra com fade e deslocamento curto", () => {
    expect(renderLayout("/").style.opacity).toBe("0");
  });
  it("sem movimento no mapa em tela cheia e com animações desligadas", () => {
    expect(renderLayout("/map").style.opacity).not.toBe("0");
    cleanup();
    expect(renderLayout("/", false).style.opacity).not.toBe("0");
  });
  it("o modal de trocar letras abre com fade e escala (ou direto, com animações desligadas)", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mountWithLayout(sc.puzzle.id);
    fireEvent.click(screen.getByRole("button", { name: "Trocar" }));
    const dialog = screen.getByRole("dialog", { name: "Trocar letras" });
    expect(dialog.style.opacity).toBe("0");
    cleanup();
    load(sc.key, sc.session, { animations: false });
    mountWithLayout(sc.puzzle.id);
    fireEvent.click(screen.getByRole("button", { name: "Trocar" }));
    expect(
      screen.getByRole("dialog", { name: "Trocar letras" }).style.opacity,
    ).not.toBe("0");
  });
});
