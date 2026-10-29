import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A abertura aparece só uma vez por abertura do app: cada teste carrega o módulo do zero.
const load = async () =>
  (await import("../components/StudioSplash")).StudioSplash;
const splash = () => document.querySelector(".studio-splash");
const studio = () => document.querySelector(".splash-studio");

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(navigator, "webdriver", {
    value: false,
    configurable: true,
  });
});

describe("abertura do app", () => {
  it("começa com a marca do estúdio e passa para a tela do jogo", async () => {
    const StudioSplash = await load();
    render(<StudioSplash ready={false} />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/Lunara Games/);
    expect(studio()).toHaveClass("on");
    act(() => void vi.advanceTimersByTime(1500));
    expect(studio()).not.toHaveClass("on");
    expect(splash()).not.toBeNull();
  });
  it("só some depois que o progresso carregou e o tempo mínimo passou", async () => {
    const StudioSplash = await load();
    const { rerender } = render(<StudioSplash ready={false} />);
    act(() => void vi.advanceTimersByTime(1500 + 5000));
    expect(splash()).not.toBeNull(); // ainda carregando: fica
    rerender(<StudioSplash ready />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(splash()).toHaveClass("leaving");
    act(() => void vi.advanceTimersByTime(400));
    expect(splash()).toBeNull();
  });
  it("um toque pula a marca do estúdio", async () => {
    const StudioSplash = await load();
    render(<StudioSplash ready={false} />);
    fireEvent.click(screen.getByRole("status"));
    expect(studio()).not.toHaveClass("on");
  });
  it("não aparece de novo na mesma abertura", async () => {
    const StudioSplash = await load();
    const first = render(<StudioSplash ready />);
    first.unmount();
    render(<StudioSplash ready />);
    expect(splash()).toBeNull();
  });
  it("é pulada em navegador automatizado (testes), salvo com ?splash=1", async () => {
    Object.defineProperty(navigator, "webdriver", {
      value: true,
      configurable: true,
    });
    const StudioSplash = await load();
    render(<StudioSplash ready />);
    expect(splash()).toBeNull();
  });
});
