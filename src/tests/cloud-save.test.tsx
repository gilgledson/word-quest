import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialPlayer, type Player } from "../services/repository";
import { levels } from "../data/catalog";

const plugin = vi.hoisted(() => ({
  status: vi.fn(),
  signIn: vi.fn(),
  unlock: vi.fn(),
  submitScore: vi.fn(),
  showAchievements: vi.fn(),
  showLeaderboard: vi.fn(),
  loadSave: vi.fn(),
  writeSave: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => plugin,
}));
vi.mock("../services/repository", async (original) => ({
  ...(await original<typeof import("../services/repository")>()),
  repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
}));

import { cloudText, mergeCloud, parseCloud, toCloud } from "../game/cloudSave";
import {
  CLOUD_SAVE_DELAY,
  PlayGamesSync,
  usePlayGamesStatus,
} from "../features/PlayGamesCard";
import { usePlayer } from "../stores/player";

const [a, b] = levels;
const onPhone: Player = {
  ...initialPlayer,
  coins: 140,
  stars: { [a.id]: 2 },
  daily: ["2026-11-14"],
  duels: { x: "loss", y: "win" },
  wordsFound: { [a.id]: [a.words[0].id, a.words[1].id] },
  achievements: ["primeiro-passo"],
  sound: false,
  sessions: { [a.id]: { letters: {} } as never },
};
const inAccount: Player = {
  ...initialPlayer,
  name: "Bia",
  avatar: "panda",
  coins: 90,
  stars: { [a.id]: 3, [b.id]: 1 },
  daily: ["2026-11-12", "2026-11-14"],
  duels: { x: "win", z: "draw" },
  wordsFound: {
    [a.id]: [a.words[1].id, a.words[2].id],
    [b.id]: [b.words[0].id],
  },
  achievements: ["diario-1"],
  cleanWins: 2,
  chestsOpened: 1,
  tutorialDone: true,
};

describe("junção do progresso do aparelho com o da nuvem", () => {
  it("fica com o maior de cada número e a união de cada lista", () => {
    const merged = mergeCloud(onPhone, toCloud(inAccount));
    expect(merged.stars).toEqual({ [a.id]: 3, [b.id]: 1 });
    expect(merged.coins).toBe(140);
    expect(merged.daily).toEqual(["2026-11-12", "2026-11-14"]);
    expect(merged.duels).toEqual({ x: "win", y: "win", z: "draw" });
    expect(merged.wordsFound[a.id].sort()).toEqual(
      [a.words[0].id, a.words[1].id, a.words[2].id].sort(),
    );
    expect(merged.wordsFound[b.id]).toEqual([b.words[0].id]);
    expect(merged.achievements.sort()).toEqual(["diario-1", "primeiro-passo"]);
    expect(merged.cleanWins).toBe(2);
    expect(merged.chestsOpened).toBe(1);
    expect(merged.tutorialDone).toBe(true);
  });

  it("não mexe nos ajustes nem nas partidas em andamento do aparelho", () => {
    const merged = mergeCloud(onPhone, toCloud(inAccount));
    expect(merged.sound).toBe(false);
    expect(merged.sessions).toBe(onPhone.sessions);
    expect(cloudText(onPhone)).not.toContain("sessions");
    expect(cloudText(onPhone)).not.toContain("sound");
  });

  it("nome e avatar só vêm da nuvem se o aparelho ainda estiver de fábrica", () => {
    expect(mergeCloud(onPhone, toCloud(inAccount)).name).toBe("Bia");
    const named = { ...onPhone, name: "Gil" };
    const merged = mergeCloud(named, toCloud(inAccount));
    expect(merged.name).toBe("Gil");
    expect(merged.avatar).toBe(named.avatar);
  });

  it("juntar duas vezes dá no mesmo, e a ordem não muda o progresso", () => {
    const once = mergeCloud(onPhone, toCloud(inAccount));
    expect(cloudText(mergeCloud(once, toCloud(inAccount)))).toBe(
      cloudText(once),
    );
    const other = mergeCloud(inAccount, toCloud(onPhone));
    expect(other.stars).toEqual(once.stars);
    expect(other.coins).toBe(once.coins);
    expect(other.achievements.sort()).toEqual(once.achievements.sort());
  });

  it("descarta o que vier fora do formato, sem quebrar", () => {
    expect(parseCloud("")).toBeUndefined();
    expect(parseCloud("{não é json")).toBeUndefined();
    expect(parseCloud('{"v":2}')).toBeUndefined();
    const odd = parseCloud(
      JSON.stringify({
        v: 1,
        coins: -5,
        stars: { [a.id]: 9, lixo: "x" },
        daily: ["2026-11-14", 7],
        duels: { x: "win", y: "talvez" },
        wordsFound: "nada",
      }),
    )!;
    expect(odd.coins).toBe(0);
    expect(odd.stars).toEqual({ [a.id]: 3 });
    expect(odd.daily).toEqual(["2026-11-14"]);
    expect(odd.duels).toEqual({ x: "win" });
    expect(odd.wordsFound).toEqual({});
    expect(mergeCloud(onPhone, odd).stars[a.id]).toBe(3);
  });
});

describe("sincronização com a conta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(plugin).forEach((f) =>
      f.mockReset().mockResolvedValue(undefined),
    );
    plugin.status.mockResolvedValue({ configured: true, signedIn: true });
    usePlayGamesStatus.setState({ configured: false, signedIn: false });
    usePlayer.setState({ player: onPhone, ready: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
  const wait = () => act(() => vi.advanceTimersByTimeAsync(CLOUD_SAVE_DELAY));

  it("junta a nuvem ao abrir e grava o resultado de volta", async () => {
    plugin.loadSave.mockResolvedValue({ data: cloudText(inAccount) });
    render(<PlayGamesSync />);
    await settle();
    expect(usePlayer.getState().player.stars).toEqual({ [a.id]: 3, [b.id]: 1 });
    expect(plugin.writeSave).not.toHaveBeenCalled();
    await wait();
    expect(plugin.writeSave).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(plugin.writeSave.mock.calls[0][0].data);
    expect(sent.stars).toEqual({ [a.id]: 3, [b.id]: 1 });
    expect(plugin.writeSave.mock.calls[0][0].description).toBe(
      `2 de ${levels.length} fases`,
    );
  });

  it("sem nada na conta, envia o progresso do aparelho", async () => {
    plugin.loadSave.mockResolvedValue({ data: "" });
    render(<PlayGamesSync />);
    await settle();
    await wait();
    expect(plugin.writeSave).toHaveBeenCalledTimes(1);
    expect(plugin.writeSave.mock.calls[0][0].data).toBe(cloudText(onPhone));
  });

  it("se a leitura falhar, nunca grava por cima da conta", async () => {
    plugin.loadSave.mockRejectedValue(new Error("sem rede"));
    render(<PlayGamesSync />);
    await settle();
    act(() => usePlayer.getState().update((p) => ({ ...p, coins: 999 })));
    await wait();
    expect(plugin.writeSave).not.toHaveBeenCalled();
  });

  it("várias mudanças seguidas viram um envio só, e nada muda sem login", async () => {
    plugin.loadSave.mockResolvedValue({ data: cloudText(onPhone) });
    render(<PlayGamesSync />);
    await settle();
    await wait();
    expect(plugin.writeSave).not.toHaveBeenCalled();
    for (const coins of [150, 160, 170])
      act(() => usePlayer.getState().update((p) => ({ ...p, coins })));
    await wait();
    expect(plugin.writeSave).toHaveBeenCalledTimes(1);
    expect(JSON.parse(plugin.writeSave.mock.calls[0][0].data).coins).toBe(170);
    // Ajuste do aparelho não é progresso: não gera envio.
    act(() => usePlayer.getState().update((p) => ({ ...p, sound: true })));
    await wait();
    expect(plugin.writeSave).toHaveBeenCalledTimes(1);
  });
});
