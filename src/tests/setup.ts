import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
// jsdom não tem canvas: o confete é trocado por um dublê em todos os testes.
vi.mock("canvas-confetti", () => ({ default: () => Promise.resolve() }));
// jsdom does not implement PointerEvent or hit testing.
if (!window.PointerEvent) {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.defineProperty(window, "PointerEvent", {
    value: TestPointerEvent,
    configurable: true,
  });
}
if (!document.elementFromPoint)
  Object.defineProperty(document, "elementFromPoint", {
    value: () => null,
    writable: true,
    configurable: true,
  });
// jsdom não toca áudio: evita o aviso "not implemented" de play()/pause().
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  value: () => Promise.resolve(),
  configurable: true,
  writable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  value: () => {},
  configurable: true,
  writable: true,
});
