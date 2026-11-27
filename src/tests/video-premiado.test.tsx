import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { today } from "../data/catalog";
import { Shop } from "../features/Shop";
import { ResultSheet } from "../features/puzzle/ResultSheet";
import { opponentById } from "../game/opponents";
import {
  alreadyDoubled,
  creditVideo,
  doubleableCoins,
  mergeRewarded,
  REWARDED,
  videosLeft,
} from "../game/rewarded";
import { mergeCloud, parseCloud, cloudText } from "../game/cloudSave";
import {
  ADS_CONFIG,
  DEV_FLAG_KEY,
  rewardedEnabled,
} from "../services/adsConfig";
import {
  setAdDriver,
  startRewarded,
  useRewarded,
  watchRewarded,
  type AdDriver,
  type AdOutcome,
} from "../services/rewardedAds";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
const tracked = vi.hoisted(() => [] as { name: string; params?: object }[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: object) => tracked.push({ name, params }),
  };
});

const D1 = "2026-11-26";
const D2 = "2026-11-27";
const base = (coins = 0): Player => ({ ...initialPlayer, coins });
const events = (name: string) => tracked.filter((e) => e.name === name);

/** Vídeo de mentira: cada `show` devolve o próximo resultado da fila. */
function fakeDriver(...outcomes: AdOutcome[]): AdDriver & { shows: number } {
  const d = {
    shows: 0,
    setup: async () => true,
    load: async () => true,
    show: async () => {
      d.shows++;
      return outcomes.shift() ?? { earned: true as const };
    },
  };
  return d;
}

const flagOn = () => localStorage.setItem(DEV_FLAG_KEY, "1");

beforeEach(() => {
  tracked.length = 0;
  localStorage.removeItem(DEV_FLAG_KEY);
  setAdDriver(undefined);
  usePlayer.setState({ player: base(0), ready: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
/** Desliga pelo build (`VITE_REWARDED_ADS=0`), mesmo com a opção ligada na configuração. */
const flagOff = () => vi.stubEnv("VITE_REWARDED_ADS", "0");

describe("Regra do vídeo premiado", () => {
  it("30 moedas por vídeo e até 5 por dia", () => {
    expect(REWARDED).toEqual({ coins: 30, maxPerDay: 5 });
    let p = base(10);
    for (let i = 0; i < 5; i++) p = creditVideo(p, D1);
    expect(p.coins).toBe(10 + 5 * 30);
    expect(videosLeft(p.rewarded, D1)).toBe(0);
    // O sexto do dia não paga nem conta.
    expect(creditVideo(p, D1)).toBe(p);
  });
  it("o limite volta no dia seguinte", () => {
    let p = base();
    for (let i = 0; i < 5; i++) p = creditVideo(p, D1);
    expect(videosLeft(p.rewarded, D2)).toBe(5);
    p = creditVideo(p, D2);
    expect(p.rewarded).toEqual({ date: D2, count: 1 });
    expect(p.coins).toBe(6 * 30);
  });
  it("moedas inválidas não creditam", () => {
    const p = base(5);
    expect(creditVideo(p, D1, 0)).toBe(p);
    expect(creditVideo(p, D1, -10)).toBe(p);
    expect(creditVideo(p, D1, Number.NaN)).toBe(p);
  });
  it("dobrar as moedas de uma partida vale uma vez só, e conta no limite", () => {
    let p = creditVideo(base(50), D1, 50, "duelo-1");
    expect(p.coins).toBe(100);
    expect(alreadyDoubled(p.rewarded, D1, "duelo-1")).toBe(true);
    expect(creditVideo(p, D1, 50, "duelo-1")).toBe(p);
    p = creditVideo(p, D1);
    expect(p.rewarded).toEqual({ date: D1, count: 2, doubled: ["duelo-1"] });
  });
  it("nuvem: vale o dia mais recente e, no mesmo dia, a maior contagem", () => {
    expect(
      mergeRewarded({ date: D1, count: 4 }, { date: D1, count: 2 }),
    ).toEqual({
      date: D1,
      count: 4,
    });
    expect(
      mergeRewarded({ date: D1, count: 4 }, { date: D2, count: 1 }),
    ).toEqual({
      date: D2,
      count: 1,
    });
    expect(mergeRewarded(undefined, undefined)).toBeUndefined();
    const phone = creditVideo(base(), D1);
    const cloud = parseCloud(
      cloudText(creditVideo(creditVideo(base(), D1), D1)),
    )!;
    expect(cloud.rewarded).toEqual({ date: D1, count: 2 });
    expect(mergeCloud(phone, cloud).rewarded).toEqual({ date: D1, count: 2 });
    expect(
      parseCloud(JSON.stringify({ v: 1, rewarded: { date: "x" } }))?.rewarded,
    ).toBeUndefined();
  });
});

describe("Opção e crédito", () => {
  it("ligado na versão publicada (conta AdMob aprovada e app verificado)", () => {
    expect(ADS_CONFIG.enabled).toBe(true);
    expect(rewardedEnabled()).toBe(true);
  });
  it("desligado pelo build: não carrega nem paga", async () => {
    flagOff();
    expect(rewardedEnabled()).toBe(false);
    const d = fakeDriver();
    setAdDriver(d);
    await startRewarded();
    expect(useRewarded.getState().ready).toBe(false);
    expect((await watchRewarded("shop", 30)).earned).toBe(false);
    expect(d.shows).toBe(0);
    expect(usePlayer.getState().player.coins).toBe(0);
  });
  it("credita só na recompensa, com os eventos de medição", async () => {
    flagOn();
    setAdDriver(fakeDriver({ earned: true }));
    await startRewarded();
    expect(useRewarded.getState().ready).toBe(true);
    const o = await watchRewarded("shop", 30);
    expect(o.earned).toBe(true);
    expect(usePlayer.getState().player.coins).toBe(30);
    expect(usePlayer.getState().player.rewarded).toEqual({
      date: today(),
      count: 1,
    });
    expect(events("rewarded_started")[0].params).toEqual({ place: "shop" });
    expect(events("rewarded_earned")[0].params).toEqual({
      place: "shop",
      coins: 30,
    });
  });
  it("vídeo fechado antes do fim não paga nem gasta o limite", async () => {
    flagOn();
    setAdDriver(fakeDriver({ earned: false, reason: "closed_early" }));
    await startRewarded();
    const o = await watchRewarded("shop_short", 30);
    expect(o).toEqual({ earned: false, reason: "closed_early" });
    expect(usePlayer.getState().player.coins).toBe(0);
    expect(usePlayer.getState().player.rewarded).toBeUndefined();
    expect(events("rewarded_earned")).toHaveLength(0);
    expect(events("rewarded_failed")[0].params).toEqual({
      place: "shop_short",
      reason: "closed_early",
    });
  });
  it("com o limite do dia alcançado não toca vídeo", async () => {
    flagOn();
    const d = fakeDriver();
    setAdDriver(d);
    await startRewarded();
    usePlayer.setState({
      player: { ...base(0), rewarded: { date: today(), count: 5 } },
    });
    expect(await watchRewarded("shop", 30)).toEqual({
      earned: false,
      reason: "limit",
    });
    expect(d.shows).toBe(0);
  });
  it("sem vídeo carregado, o pedido falha sem tocar nada", async () => {
    flagOn();
    setAdDriver({ ...fakeDriver(), load: async () => false });
    await startRewarded();
    expect(await watchRewarded("shop", 30)).toEqual({
      earned: false,
      reason: "not_ready",
    });
  });
});

const renderShop = () =>
  render(
    <MemoryRouter>
      <Shop />
    </MemoryRouter>,
  );

describe("Botões na loja", () => {
  it("opção desligada: nenhum botão de vídeo", async () => {
    flagOff();
    setAdDriver(fakeDriver());
    renderShop();
    await act(async () => {});
    expect(screen.queryByRole("button", { name: /vídeo/i })).toBeNull();
  });
  it("com moedas para tudo: card 'Moedas grátis' (place shop)", async () => {
    flagOn();
    setAdDriver(fakeDriver());
    usePlayer.setState({ player: base(100) });
    renderShop();
    await screen.findByRole("button", { name: /Assistir vídeo: \+30/ });
    expect(
      screen.getByRole("heading", { name: "Moedas grátis" }),
    ).toBeVisible();
    expect(screen.getByText(/restam 5 hoje/)).toBeInTheDocument();
    expect(events("rewarded_offer_shown")[0].params).toEqual({ place: "shop" });
  });
  it("sem moedas para um item: o card vira o atalho 'Sem moedas?' e assistir credita", async () => {
    flagOn();
    setAdDriver(fakeDriver({ earned: true }));
    renderShop();
    const watch = await screen.findByRole("button", {
      name: /Assistir vídeo: \+30/,
    });
    expect(screen.getByRole("heading", { name: "Sem moedas?" })).toBeVisible();
    // Um botão só (nada de linha a mais em cada item).
    expect(screen.getAllByRole("button", { name: /vídeo/i })).toHaveLength(1);
    expect(events("rewarded_offer_shown")[0].params).toEqual({
      place: "shop_short",
    });
    await act(async () => {
      fireEvent.click(watch);
    });
    await waitFor(() => expect(usePlayer.getState().player.coins).toBe(30));
    expect(events("rewarded_earned")[0].params).toEqual({
      place: "shop_short",
      coins: 30,
    });
    expect(screen.getByText(/\+30 moedas! Obrigado/)).toBeInTheDocument();
    expect(await screen.findByText(/restam 4 hoje/)).toBeInTheDocument();
  });
  it("some quando o limite do dia acaba", async () => {
    flagOn();
    setAdDriver(fakeDriver());
    usePlayer.setState({
      player: { ...base(0), rewarded: { date: today(), count: 5 } },
    });
    renderShop();
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByRole("button", { name: /vídeo/i })).toBeNull();
  });
});

describe("Quanto o fim do duelo pode dobrar", () => {
  const base = {
    result: "win" as const,
    daily: false,
    online: false,
    unpaid: true,
    tutorial: false,
  };
  it("Aventura e Casual: o que o duelo pagou (vitória 50, empate 25)", () => {
    expect(doubleableCoins(base)).toBe(50);
    expect(doubleableCoins({ ...base, result: "draw" })).toBe(25);
  });
  it("duelo ao vivo (pessoa ou rival da busca) também dobra", () => {
    expect(doubleableCoins({ ...base, online: true })).toBe(50);
    expect(doubleableCoins({ ...base, online: true, result: "draw" })).toBe(25);
  });
  it("derrota não oferece vídeo (não pagou, ou tirou moedas)", () => {
    expect(doubleableCoins({ ...base, result: "loss" })).toBe(0);
    expect(doubleableCoins({ ...base, online: true, result: "loss" })).toBe(0);
  });
  it("Diário: só a vitória do dia", () => {
    expect(doubleableCoins({ ...base, daily: true })).toBe(70);
    expect(doubleableCoins({ ...base, daily: true, result: "draw" })).toBe(0);
  });
  it("partida já paga (reaberta ou revanche) e tutorial ficam sem oferta", () => {
    expect(doubleableCoins({ ...base, unpaid: false })).toBe(0);
    expect(doubleableCoins({ ...base, tutorial: true })).toBe(0);
  });
});

describe("Fim do duelo", () => {
  const sheet = (doubleCoins: number) => (
    <MemoryRouter>
      <ResultSheet
        result="win"
        playerName="Eu"
        playerFace={{ id: "jogador" }}
        rival={opponentById("sabi")!}
        mood="sad"
        moodKey={0}
        scores={{ p: 20, ai: 10 }}
        coins={50}
        stars={2}
        daily={false}
        casual={false}
        online={false}
        backTo="/"
        enabled={false}
        onNext={() => {}}
        onReplay={() => {}}
        doubleCoins={doubleCoins}
        doubleKey="duelo-x"
      />
    </MemoryRouter>
  );
  it("dobra as moedas uma vez e o botão some", async () => {
    flagOn();
    setAdDriver(fakeDriver({ earned: true }));
    await act(async () => {
      await startRewarded();
    });
    render(sheet(50));
    const btn = await screen.findByRole("button", { name: /dobrar as moedas/ });
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(usePlayer.getState().player.coins).toBe(50));
    expect(events("rewarded_earned")[0].params).toEqual({
      place: "duel_end",
      coins: 50,
    });
    expect(
      screen.queryByRole("button", { name: /dobrar as moedas/ }),
    ).toBeNull();
  });
  it("sem moedas a dobrar (partida reaberta, tutorial), sem botão", async () => {
    flagOn();
    setAdDriver(fakeDriver());
    await act(async () => {
      await startRewarded();
    });
    render(sheet(0));
    expect(screen.queryByRole("button", { name: /dobrar/i })).toBeNull();
  });
});
