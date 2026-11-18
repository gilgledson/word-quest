import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reminderPlan } from "../services/reminders";
import { LOGIN_REWARDS } from "../game/loginReward";
import { DailyRewardFlow } from "../features/DailyReward";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";
import { today } from "../data/catalog";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => cleanup());

const base = { reminders: true, daily: [] as string[], streak: 0 };

describe("lembretes do dia", () => {
  it("agenda os próximos 7 dias às 18:30, com a recompensa de cada dia", () => {
    const plan = reminderPlan(base, "2026-11-18", new Date(2026, 10, 18, 9, 0));
    expect(plan).toHaveLength(7);
    const first = plan[0].schedule!.at!;
    expect([first.getDate(), first.getHours(), first.getMinutes()]).toEqual([
      18, 18, 30,
    ]);
    expect(plan[0].body).toContain(`+${LOGIN_REWARDS[0]} moedas`);
    expect(plan[1].body).toContain(`+${LOGIN_REWARDS[1]} moedas`);
    // O 7º dia anuncia o baú.
    expect(plan[6].body).toContain("Dia 7");
  });
  it("pula hoje depois das 18:30 ou se já pegou a recompensa e fez o desafio", () => {
    expect(
      reminderPlan(base, "2026-11-18", new Date(2026, 10, 18, 19, 0)),
    ).toHaveLength(6);
    const done = {
      ...base,
      daily: ["2026-11-18"],
      loginReward: { last: "2026-11-18", day: 3 },
    };
    const plan = reminderPlan(done, "2026-11-18", new Date(2026, 10, 18, 9));
    expect(plan).toHaveLength(6);
    // Amanhã é o dia 4 do ciclo.
    expect(plan[0].body).toContain(`+${LOGIN_REWARDS[3]} moedas`);
  });
  it("lembra a sequência do desafio do dia quando ela existe", () => {
    const plan = reminderPlan(
      { ...base, streak: 4 },
      "2026-11-18",
      new Date(2026, 10, 18, 9),
    );
    expect(plan[0].body).toContain("sequência de 4 dias");
  });
});

function open(patch: Partial<Player> = {}) {
  usePlayer.setState({
    player: {
      ...structuredClone(initialPlayer),
      tutorialDone: true,
      sound: false,
      animations: false,
      ...patch,
    },
    ready: true,
  });
  render(
    <MemoryRouter>
      <DailyRewardFlow />
    </MemoryRouter>,
  );
}

describe("janela da recompensa diária", () => {
  it("aparece na primeira abertura do dia e pegar soma as moedas uma vez", () => {
    open();
    expect(
      screen.getByRole("dialog", { name: "Recompensa diária" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Amanhã: +${LOGIN_REWARDS[1]} moedas`),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: `Pegar +${LOGIN_REWARDS[0]} moedas` }),
    );
    const p = usePlayer.getState().player;
    expect(p.coins).toBe(initialPlayer.coins + LOGIN_REWARDS[0]);
    expect(p.loginReward).toEqual({ last: today(), day: 1 });
    // No navegador não há lembrete para pedir: a janela some.
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("não aparece se já pegou hoje nem antes do tutorial", () => {
    open({ loginReward: { last: today(), day: 2 } });
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    open({ tutorialDone: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("pedido do lembrete (app Android)", () => {
  it("depois de pegar a recompensa pergunta uma vez e guarda a resposta", async () => {
    const reminders = await import("../services/reminders");
    vi.spyOn(reminders, "remindersSupported").mockReturnValue(true);
    const ask = vi
      .spyOn(reminders, "askReminderPermission")
      .mockResolvedValue(true);
    open();
    fireEvent.click(screen.getByRole("button", { name: /^Pegar/ }));
    expect(
      screen.getByRole("dialog", { name: "Lembrete diário" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sim, me avise" }));
    await vi.waitFor(() =>
      expect(usePlayer.getState().player.reminders).toBe(true),
    );
    expect(ask).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.restoreAllMocks();
  });
  it("'Agora não' desliga sem pedir a permissão do sistema", async () => {
    const reminders = await import("../services/reminders");
    vi.spyOn(reminders, "remindersSupported").mockReturnValue(true);
    const ask = vi.spyOn(reminders, "askReminderPermission");
    open();
    fireEvent.click(screen.getByRole("button", { name: /^Pegar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));
    await vi.waitFor(() =>
      expect(usePlayer.getState().player.reminders).toBe(false),
    );
    expect(ask).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
