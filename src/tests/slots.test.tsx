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
import { RETURN_MS } from "../hooks/useLetterDrag";
import { reconcileSlots } from "../hooks/useRackSlots";
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
  vi.restoreAllMocks();
});

describe("Casas fixas do banco (reconcileSlots)", () => {
  it("distribui as peças novas da esquerda para a direita", () => {
    expect(reconcileSlots([], ["a", "b", "c"], {}, 5)).toEqual([
      "a",
      "b",
      "c",
      null,
      null,
    ]);
  });
  it("quando uma peça sai, o lugar dela fica vazio e as outras não andam", () => {
    const before = ["a", "b", "c", "d", "e"];
    expect(reconcileSlots(before, ["a", "b", "d", "e"], {}, 5)).toEqual([
      "a",
      "b",
      null,
      "d",
      "e",
    ]);
  });
  it("a peça devolvida volta ao lugar de onde saiu, mesmo havendo outro vazio antes", () => {
    const gap = ["a", null, "c", null, "e"];
    expect(reconcileSlots(gap, ["a", "c", "e", "b"], { b: 3 }, 5)).toEqual([
      "a",
      null,
      "c",
      "b",
      "e",
    ]);
  });
  it("peça nova ocupa o primeiro lugar vazio; sem lembrança, vale o mesmo para a devolvida", () => {
    const gap = ["a", null, "c", null, "e"];
    expect(reconcileSlots(gap, ["a", "c", "e", "n"], {}, 5)).toEqual([
      "a",
      "n",
      "c",
      null,
      "e",
    ]);
  });
  it("nunca perde peças: com mais peças que casas, o banco cresce", () => {
    expect(reconcileSlots([], ["a", "b", "c"], {}, 2)).toEqual(["a", "b", "c"]);
  });
});

describe("Banco na tela", () => {
  function open() {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), tutorialDone: true },
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
  const tiles = () => screen.getAllByRole("button", { name: /^Inserir letra/ });
  const slotOf = (el: Element) => el.getAttribute("data-slot");
  const empty = () => document.querySelectorAll(".slot-empty");

  it("colocar uma peça deixa o lugar vazio e não desloca as outras", () => {
    open();
    const before = tiles().map((t) => [t.getAttribute("data-tile"), slotOf(t)]);
    expect(empty()).toHaveLength(0);
    fireEvent.click(tiles()[1]);
    expect(tiles()).toHaveLength(4);
    expect(empty()).toHaveLength(1);
    expect(slotOf(empty()[0])).toBe("1");
    const after = tiles().map((t) => [t.getAttribute("data-tile"), slotOf(t)]);
    expect(after).toEqual(before.filter((_, i) => i !== 1));
  });
  it("a letra devolvida volta ao mesmo lugar do banco", () => {
    open();
    const moved = tiles()[2];
    const id = moved.getAttribute("data-tile");
    fireEvent.click(moved);
    const placed = document.querySelector<HTMLElement>(".cell.pending")!;
    fireEvent.click(placed);
    expect(empty()).toHaveLength(0);
    const back = document.querySelector(`[data-tile="${id}"]`)!;
    expect(slotOf(back)).toBe("2");
  });
  it("as casas vazias não são botões para o leitor de tela", () => {
    open();
    fireEvent.click(tiles()[0]);
    expect(empty()[0]).toHaveAttribute("aria-hidden", "true");
    expect(
      screen
        .queryAllByRole("button")
        .some((b) => b.classList.contains("slot-empty")),
    ).toBe(false);
  });
});

describe("Voo da letra entre o banco e a grade", () => {
  const rect = {
    left: 40,
    top: 600,
    width: 60,
    height: 70,
    right: 100,
    bottom: 670,
    x: 40,
    y: 600,
    toJSON: () => ({}),
  } as DOMRect;
  function open() {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), tutorialDone: true },
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
  const flights = () => document.querySelectorAll(".tile-flight");
  const tile = () =>
    screen.getAllByRole("button", { name: /^Inserir letra/ })[0];

  it("tocar numa peça faz a letra voar até a casa; ela fica invisível lá até chegar", () => {
    vi.useFakeTimers();
    open();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    fireEvent.click(tile());
    expect(flights()).toHaveLength(1);
    expect(document.querySelector(".cell.pending")).toHaveClass("in-flight");
    act(() => {
      vi.advanceTimersByTime(RETURN_MS + 60);
    });
    expect(flights()).toHaveLength(0);
    expect(document.querySelector(".cell.pending")).not.toHaveClass(
      "in-flight",
    );
  });
  it("devolver uma letra à mão faz ela voar de volta, e a peça só reaparece ao chegar", () => {
    vi.useFakeTimers();
    open();
    fireEvent.click(tile());
    act(() => {
      vi.advanceTimersByTime(RETURN_MS + 60);
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    fireEvent.click(document.querySelector<HTMLElement>(".cell.pending")!);
    expect(flights()).toHaveLength(1);
    const back = document.querySelector(".letter-bank .in-flight");
    expect(back).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(RETURN_MS + 60);
    });
    expect(flights()).toHaveLength(0);
    expect(document.querySelector(".letter-bank .in-flight")).toBeNull();
  });
  it("sem animações não há voo", () => {
    vi.useFakeTimers();
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        tutorialDone: true,
        animations: false,
      },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={["/play/vila-1?vs=medio"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    fireEvent.click(tile());
    expect(flights()).toHaveLength(0);
  });
});
