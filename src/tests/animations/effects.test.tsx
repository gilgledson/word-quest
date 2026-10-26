import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayer } from "../../stores/player";
import { economy } from "../../game/crossword-engine";
import { crossScenario, load, mount } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // @ts-expect-error limpeza do mock de matchMedia dos testes
  delete window.matchMedia;
});

const cellEl = (k: string) =>
  document.querySelector<HTMLElement>(`[data-cell="${k}"]`)!;
const clickTile = (letter: string) =>
  fireEvent.click(
    screen.getAllByRole("button", { name: `Inserir letra ${letter}` })[0],
  );
const confirmBtn = () =>
  screen.getByRole("button", { name: /^(Confirmar|Passar a vez)$/ });
const wordFx = () => [...document.querySelectorAll(".fx-word")];
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/** Coloca a letra certa no cruzamento e confirma (fecha as duas palavras). */
function playCross(patch = {}) {
  const sc = crossScenario();
  load(sc.key, sc.session, patch);
  mount(sc.puzzle.id);
  fireEvent.click(cellEl(sc.cross));
  clickTile(sc.letter);
  fireEvent.click(confirmBtn());
  return sc;
}

describe("Contorno da palavra concluída", () => {
  it("duas palavras cruzadas fechadas no mesmo ✓ ganham um contorno cada, escalonados", () => {
    playCross();
    const words = wordFx();
    expect(words).toHaveLength(2);
    expect(
      words.map((w) => (w as HTMLElement).style.getPropertyValue("--fx-delay")),
    ).toEqual(["0ms", "180ms"]);
    for (const w of words) {
      expect(w).toHaveClass("player");
      expect(w.querySelector("svg path.fx-line")).toBeTruthy();
      expect(w.querySelectorAll(".fx-spark").length).toBeGreaterThan(0);
    }
  });
  it("os efeitos somem sozinhos e a camada não captura toques", () => {
    playCross();
    expect(document.querySelector(".fx-layer")).toBeInTheDocument();
    advance(1500);
    expect(wordFx()).toHaveLength(0);
  });
  it("é interrompível: dá para escolher outra palavra e jogar com os efeitos ainda na tela", () => {
    playCross();
    expect(wordFx().length).toBeGreaterThan(0);
    const other = screen
      .getAllByRole("button", { name: /^Pista:/ })
      .find((b) => !b.classList.contains("selected-clue"))!;
    fireEvent.click(other);
    expect(other).toHaveClass("selected-clue");
    expect(wordFx().length).toBeGreaterThan(0);
  });
  it("partida restaurada (recarregar) não reproduz efeitos antigos", () => {
    const sc = crossScenario();
    // Todas as casas das duas palavras já estão confirmadas, inclusive o cruzamento.
    const done = JSON.parse(JSON.stringify(sc.session));
    sc.engine.rack.lockCell(done, sc.cross, "p");
    load(sc.key, done);
    mount(sc.puzzle.id);
    expect(wordFx()).toHaveLength(0);
    cleanup();
    mount(sc.puzzle.id);
    expect(wordFx()).toHaveLength(0);
  });
  it("depois de jogar, remontar a tela não repete o contorno", () => {
    const sc = playCross();
    advance(1500);
    cleanup();
    mount(sc.puzzle.id);
    expect(wordFx()).toHaveLength(0);
  });
  it("movimento reduzido: só o quadro, sem linha de energia, pulso nem faíscas", () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    playCross();
    const [first] = wordFx();
    expect(first).toHaveClass("reduced");
    expect(first.querySelector(".fx-spark")).toBeNull();
    expect(first.querySelector(".fx-cell-pulse")).toBeNull();
  });
  it("animações desligadas: nenhum efeito, e o estado final do jogo é idêntico", () => {
    const on = playCross();
    const withFx = JSON.stringify(usePlayer.getState().player.sessions[on.key]);
    cleanup();
    advance(2000);
    const off = playCross({ animations: false });
    const withoutFx = JSON.stringify(
      usePlayer.getState().player.sessions[off.key],
    );
    expect(wordFx()).toHaveLength(0);
    expect(document.querySelector(".confirm-pulse")).toBeNull();
    expect(withoutFx).toBe(withFx);
  });
});

describe("Feedback das jogadas", () => {
  it("o encaixe da letra e o anel do ✓ aparecem e passam", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mount(sc.puzzle.id);
    fireEvent.click(cellEl(sc.cross));
    clickTile(sc.letter);
    expect(cellEl(sc.cross)).toHaveClass("just-placed");
    advance(400);
    expect(cellEl(sc.cross)).not.toHaveClass("just-placed");
    fireEvent.click(confirmBtn());
    expect(document.querySelector(".confirm-pulse")).toBeInTheDocument();
  });
  it("selecionar uma palavra aplica a varredura só nas casas dela", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mount(sc.puzzle.id);
    fireEvent.click(cellEl(sc.cross));
    const swept = [...document.querySelectorAll(".letter.sweep")];
    expect(swept.length).toBeGreaterThan(1);
    expect(swept.length).toBeLessThanOrEqual(10);
    for (const el of swept) expect(el).toHaveClass("active");
    const indexes = swept.map((el) =>
      (el as HTMLElement).style.getPropertyValue("--i"),
    );
    expect(indexes).toContain("0");
  });
  it("letra errada no ✓: a peça-fantasma treme e volta ao banco, sem mudar o motor", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mount(sc.puzzle.id);
    fireEvent.click(cellEl(sc.cross));
    const wrong = screen
      .getAllByRole("button", { name: /^Inserir letra / })
      .find((b) => !b.getAttribute("aria-label")!.endsWith(sc.letter))!;
    const wrongLetter = wrong.getAttribute("aria-label")!.slice(-1);
    fireEvent.click(wrong);
    fireEvent.click(confirmBtn());
    const ghost = document.querySelector(".fx-reject");
    expect(ghost).toHaveTextContent(wrongLetter);
    expect(wordFx()).toHaveLength(0);
    // A casa continua vazia: o motor devolveu a peça ao banco.
    expect(cellEl(sc.cross)).toHaveAccessibleName(/vazia/);
    advance(600);
    expect(document.querySelector(".fx-reject")).toBeNull();
  });
  it("Dica: estrela e brilho na casa, botão iluminado, custo cobrado uma só vez", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mount(sc.puzzle.id);
    fireEvent.click(cellEl(sc.cross));
    const before = usePlayer.getState().player.coins;
    fireEvent.click(screen.getByRole("button", { name: "Dica" }));
    expect(document.querySelector(".fx-star")).toBeInTheDocument();
    expect(document.querySelector(".fx-hint-glow")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dica" })).toHaveClass(
      "fx-hint-btn",
    );
    // Palavras fechadas só pela Dica: contorno discreto.
    expect(wordFx().every((w) => w.classList.contains("assisted"))).toBe(true);
    advance(1500);
    expect(document.querySelector(".fx-star")).toBeNull();
    expect(usePlayer.getState().player.coins).toBe(before - economy.hint);
  });
  it("Trocar: as peças trocadas saem do banco com animação própria", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mount(sc.puzzle.id);
    fireEvent.click(screen.getByRole("button", { name: "Trocar" }));
    const first = screen.getAllByRole("button", { name: /^Trocar letra / })[0];
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar troca" }));
    expect(document.querySelectorAll(".fx-swap-out").length).toBe(1);
    advance(800);
    expect(document.querySelector(".fx-swap-out")).toBeNull();
  });
  it("vez do oponente: pontinhos de pensando (e nenhum com animações desligadas)", () => {
    const sc = crossScenario();
    const turn = JSON.parse(JSON.stringify(sc.session));
    turn.versus.turn = "ai";
    load(sc.key, turn);
    mount(sc.puzzle.id);
    expect(screen.getByTestId("fx-dots")).toBeInTheDocument();
    cleanup();
    load(sc.key, turn, { animations: false });
    mount(sc.puzzle.id);
    expect(screen.queryByTestId("fx-dots")).toBeNull();
  });
});

describe("Arrastar e soltar: desempenho e limpeza", () => {
  const setup = () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    let commits = 0;
    mount(sc.puzzle.id, (tree) => (
      <Profiler id="page" onRender={() => commits++}>
        {tree}
      </Profiler>
    ));
    fireEvent.click(cellEl(sc.cross));
    const tile = screen.getAllByRole("button", {
      name: `Inserir letra ${sc.letter}`,
    })[0];
    const move = (x: number, y: number, target: Element | null) => {
      vi.spyOn(document, "elementFromPoint").mockReturnValue(target);
      fireEvent.pointerMove(tile, { pointerId: 1, clientX: x, clientY: y });
    };
    const down = () =>
      fireEvent.pointerDown(tile, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        clientX: 20,
        clientY: 500,
      });
    return { sc, tile, move, down, commits: () => commits };
  };
  it("o fantasma acompanha o ponteiro sem renderizar a tela de novo a cada movimento", () => {
    const { sc, move, down, commits } = setup();
    const target = cellEl(sc.cross);
    down();
    move(60, 420, target); // começa o arrasto (um render para montar o fantasma)
    const ghost = document.querySelector<HTMLElement>(".drag-letter-ghost")!;
    expect(ghost).toBeInTheDocument();
    const after = commits();
    for (const [x, y] of [
      [80, 380],
      [120, 330],
      [160, 280],
    ]) {
      move(x, y, target);
      expect(ghost.style.transform).toContain(`translate3d(${x}px, ${y}px, 0)`);
    }
    expect(commits()).toBe(after);
  });
  it("o destino é destacado na hora e o destaque some ao cancelar o gesto", () => {
    const { sc, tile, move, down } = setup();
    const target = cellEl(sc.cross);
    down();
    move(60, 420, target);
    expect(target).toHaveClass("drop-ready");
    fireEvent.pointerCancel(tile, { pointerId: 1 });
    expect(target).not.toHaveClass("drop-ready");
    expect(document.querySelector(".drag-letter-ghost")).toBeNull();
  });
  it("soltar valida no motor: a letra é colocada e o destaque é limpo", () => {
    const { sc, tile, move, down } = setup();
    const target = cellEl(sc.cross);
    down();
    move(60, 420, target);
    fireEvent.pointerUp(tile, { pointerId: 1, clientX: 60, clientY: 420 });
    expect(target).not.toHaveClass("drop-ready");
    expect(cellEl(sc.cross)).toHaveClass("pending");
  });
  it("sobre uma casa já confirmada o destino é marcado como inválido", () => {
    const { sc, move, down } = setup();
    const locked = document.querySelector<HTMLElement>(".letter.correct")!;
    expect(locked).toBeTruthy();
    void sc;
    down();
    move(60, 420, locked);
    expect(locked).toHaveClass("drop-invalid");
  });
});
