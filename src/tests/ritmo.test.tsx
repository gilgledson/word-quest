import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";
import { PuzzlePage } from "../features/PuzzlePage";
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
});
function open(patch: Partial<typeof initialPlayer> = {}) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), tutorialDone: true, ...patch },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={["/play/vila-1?vs=dificil"]}>
      <Routes>
        <Route path="/play/:id" element={<PuzzlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const session = () => usePlayer.getState().player.sessions["vs:vila-1:dificil"];
const pass = () =>
  fireEvent.click(screen.getByRole("button", { name: "Passar a vez" }));

it("o rival coloca as letras uma a uma antes de confirmar a jogada", () => {
  vi.useFakeTimers();
  open();
  pass();
  expect(session().versus?.turn).toBe("ai");
  const seen: number[] = [];
  for (let t = 0; t < 6000 && session().versus?.turn === "ai"; t += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
    seen.push(document.querySelectorAll(".cell.bot-reveal").length);
    // Nada é gravado na sessão enquanto as letras ainda aparecem.
    if (seen.at(-1)) expect(session().versus?.turn).toBe("ai");
  }
  expect(session().versus?.turn).toBe("p");
  expect(Math.max(...seen)).toBeGreaterThan(0);
  // Cresce de uma em uma: nunca salta duas letras entre dois instantes.
  seen.reduce((a, b) => {
    expect(b - a).toBeLessThanOrEqual(1);
    return b;
  }, 0);
  expect(document.querySelectorAll(".cell.bot-reveal")).toHaveLength(0);
});

it("sem animações o rival joga de uma vez, sem letras em reveal", () => {
  vi.useFakeTimers();
  open({ animations: false });
  pass();
  act(() => {
    vi.advanceTimersByTime(10);
  });
  expect(document.querySelectorAll(".cell.bot-reveal")).toHaveLength(0);
  expect(session().versus?.turn).toBe("p");
});

it("o relógio do turno é opcional: desligado por padrão, não aparece", () => {
  open();
  expect(screen.queryByRole("timer")).toBeNull();
});

it("com o relógio ligado a barra aparece e, ao zerar, a vez passa", () => {
  vi.useFakeTimers();
  open({ turnTimer: true });
  expect(screen.getByRole("timer")).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(24_000);
  });
  expect(session()?.versus?.turn ?? "p").toBe("p");
  act(() => {
    vi.advanceTimersByTime(1_500);
  });
  expect(session().versus?.turn).toBe("ai");
  expect(screen.queryByRole("timer")).toBeNull();
});

it("o relógio não atrapalha o tutorial da fase 1", () => {
  open({ turnTimer: true, tutorialDone: false });
  expect(screen.queryByRole("timer")).toBeNull();
});
