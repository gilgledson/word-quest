import { describe, expect, it } from "vitest";
import {
  measureCells,
  perimeterPath,
  toLocalRect,
  unionRect,
} from "../../animations/utils/animationGeometry";

const box = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  }) as DOMRect;

/** Contêiner com casas em posições conhecidas (tela), com getBoundingClientRect simulado. */
function board(container: DOMRect, cells: Record<string, DOMRect>) {
  const root = document.createElement("div");
  root.getBoundingClientRect = () => container;
  Object.defineProperty(root, "offsetWidth", { value: container.width });
  Object.defineProperty(root, "offsetHeight", { value: container.height });
  for (const [k, r] of Object.entries(cells)) {
    const el = document.createElement("button");
    el.dataset.cell = k;
    el.getBoundingClientRect = () => r;
    root.appendChild(el);
  }
  return root;
}

describe("animationGeometry", () => {
  it("une retângulos e devolve null sem nenhum", () => {
    expect(unionRect([])).toBeNull();
    expect(
      unionRect([
        { x: 10, y: 10, w: 20, h: 20 },
        { x: 30, y: 10, w: 20, h: 20 },
      ]),
    ).toEqual({ x: 10, y: 10, w: 40, h: 20 });
  });
  it("o perímetro começa no canto superior esquerdo e segue no sentido horário", () => {
    expect(perimeterPath(40, 20)).toBe("M 0 0 H 40 V 20 H 0 Z");
  });
  it("converte para o sistema local do contêiner e desfaz a escala", () => {
    expect(toLocalRect(box(110, 230, 40, 20), box(100, 200, 300, 400))).toEqual(
      { x: 10, y: 30, w: 40, h: 20 },
    );
    // Contêiner desenhado em dobro (transform: scale(2)): a posição volta à escala do layout.
    expect(
      toLocalRect(box(120, 260, 80, 40), box(100, 200, 600, 800), 2, 2),
    ).toEqual({ x: 10, y: 30, w: 40, h: 20 });
  });
  it("palavra horizontal: posição, largura e altura reais", () => {
    const root = board(box(100, 200, 300, 400), {
      "1,1": box(110, 230, 40, 40),
      "1,2": box(150, 230, 40, 40),
      "1,3": box(190, 230, 40, 40),
    });
    const m = measureCells(root, ["1,1", "1,2", "1,3"])!;
    expect(m.rect).toEqual({ x: 10, y: 30, w: 120, h: 40 });
    expect(m.cells).toHaveLength(3);
  });
  it("palavra vertical: posição, largura e altura reais", () => {
    const root = board(box(0, 0, 300, 400), {
      "1,1": box(20, 50, 40, 40),
      "2,1": box(20, 90, 40, 40),
    });
    expect(measureCells(root, ["1,1", "2,1"])!.rect).toEqual({
      x: 20,
      y: 50,
      w: 40,
      h: 80,
    });
  });
  it("tabuleiro girado: a palavra que era horizontal vira uma coluna (usa as posições visuais)", () => {
    const root = board(box(10, 10, 300, 400), {
      "1,1": box(30, 130, 40, 40),
      "1,2": box(30, 90, 40, 40),
      "1,3": box(30, 50, 40, 40),
    });
    expect(measureCells(root, ["1,1", "1,2", "1,3"])!.rect).toEqual({
      x: 20,
      y: 40,
      w: 40,
      h: 120,
    });
  });
  it("redimensionar o contêiner muda o retângulo junto, sem deslocar", () => {
    const small = board(box(0, 0, 200, 300), { "1,1": box(10, 10, 20, 20) });
    const large = board(box(0, 0, 400, 600), { "1,1": box(20, 20, 40, 40) });
    expect(measureCells(small, ["1,1"])!.rect).toEqual({
      x: 10,
      y: 10,
      w: 20,
      h: 20,
    });
    expect(measureCells(large, ["1,1"])!.rect).toEqual({
      x: 20,
      y: 20,
      w: 40,
      h: 40,
    });
  });
  it("sem nenhuma casa encontrada devolve null", () => {
    expect(measureCells(board(box(0, 0, 10, 10), {}), ["9,9"])).toBeNull();
  });
});
