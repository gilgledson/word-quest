import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Shop } from "../features/Shop";
import {
  ALL_PREMIUM_AVATARS,
  AVATAR_PRICES,
  avatarOf,
  buyAvatar,
  INDIA_AVATARS,
  pickableAvatars,
  PLAYER_AVATARS,
  PREMIUM_AVATARS,
} from "../game/avatars";
import { mergeCloud, parseCloud, cloudText, toCloud } from "../game/cloudSave";
import {
  buyFrame,
  currentFrame,
  FRAME_HOLE,
  FRAME_IDS,
  FRAME_PRICES,
  frameArt,
  wearFrame,
} from "../game/frames";
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
afterEach(() => {
  cleanup();
  tracked.length = 0;
});

const base = (coins = 0, patch: Partial<Player> = {}): Player => ({
  ...structuredClone(initialPlayer),
  coins,
  ...patch,
});

describe("Regras das molduras", () => {
  it("16 molduras (8 clássicas e 8 rústicas) de 150 a 500 moedas, cada uma com arte e o furo medido", () => {
    expect(FRAME_IDS).toHaveLength(16);
    expect(new Set(FRAME_IDS).size).toBe(16);
    expect(FRAME_PRICES.bronze).toBe(150);
    expect(FRAME_PRICES.lendaria).toBe(500);
    for (const id of FRAME_IDS) {
      expect(frameArt(id)).toBe(`/art/molduras/${id}.webp`);
      expect(FRAME_HOLE[id]).toBeGreaterThan(0.3);
      expect(FRAME_HOLE[id]).toBeLessThan(0.8);
    }
  });
  it("comprar desconta as moedas e já passa a usar; sem moedas ou repetida, nada muda", () => {
    const p = buyFrame(base(400), "prata");
    expect(p.coins).toBe(200);
    expect(p.frames).toEqual(["prata"]);
    expect(currentFrame(p)).toBe("prata");
    expect(buyFrame(p, "prata")).toBe(p);
    const poor = base(100);
    expect(buyFrame(poor, "bronze")).toBe(poor);
  });
  it("só usa moldura que tem; tirar deixa sem nenhuma; moldura desconhecida não vale", () => {
    const p = buyFrame(buyFrame(base(400), "bronze"), "prata");
    expect(currentFrame(wearFrame(p, "bronze"))).toBe("bronze");
    expect(wearFrame(p, "ouro")).toBe(p);
    expect(currentFrame(wearFrame(p, undefined))).toBeUndefined();
    expect(currentFrame(base(0, { frames: ["xyz"], frame: "xyz" }))).toBe(
      undefined,
    );
  });
});

describe("Molduras na nuvem", () => {
  it("vão para a conta e voltam: a união das compradas, a em uso do aparelho", () => {
    const phone = buyFrame(base(500), "bronze");
    const account = buyFrame(base(500), "ouro");
    const cloud = parseCloud(cloudText(account))!;
    expect(cloud.frames).toEqual(["ouro"]);
    const merged = mergeCloud(phone, cloud);
    expect(merged.frames?.sort()).toEqual(["bronze", "ouro"]);
    expect(merged.frame).toBe("bronze");
    // Aparelho sem moldura em uso: a da conta passa a valer.
    expect(mergeCloud(base(0), toCloud(account)).frame).toBe("ouro");
    // Dados inválidos na nuvem são ignorados.
    const bad = parseCloud(
      JSON.stringify({ ...toCloud(base()), frames: ["x", 3], frame: "x" }),
    )!;
    expect(bad.frames).toBeUndefined();
    expect(bad.frame).toBeUndefined();
  });
});

describe("Loja em 3 abas", () => {
  const open = (coins: number, url = "/loja?aba=molduras") => {
    usePlayer.setState({ player: base(coins), ready: true });
    render(
      <MemoryRouter initialEntries={[url]}>
        <Shop />
      </MemoryRouter>,
    );
  };
  it("abas Itens, Avatares, Molduras e Tabuleiros; o antigo ?aba=perfil abre os avatares", () => {
    open(300, "/loja?aba=perfil");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Itens",
      "Avatares",
      "Molduras",
      "Tabuleiros",
    ]);
    expect(screen.getByRole("tab", { name: "Avatares" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Fora da aba Itens, o saldo grande some (a pílula do topo já mostra as moedas).
    expect(screen.queryByText("Seu saldo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Molduras" }));
    expect(
      screen.getByRole("list", { name: "Molduras de perfil" }),
    ).toBeVisible();
  });
  it("molduras: as 16 em Todas, e os filtros Rústicas e Clássicas; comprar desconta, passa a usar e mede", () => {
    open(300);
    expect(
      screen
        .getByRole("list", { name: "Molduras de perfil" })
        .querySelectorAll("li"),
    ).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: "Rústicas" }));
    expect(
      screen.getByRole("list", { name: "Rústicas" }).querySelectorAll("li"),
    ).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Clássicas" }));
    expect(
      screen.getByRole("list", { name: "Clássicas" }).querySelectorAll("li"),
    ).toHaveLength(8);
    // Sem moedas para a Lendária: o botão diz quanto falta.
    expect(
      screen.getByRole("button", {
        name: "Comprar a moldura Lendária por 500 moedas",
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Comprar a moldura Prata com estrelinhas por 200 moedas",
      }),
    );
    const p = usePlayer.getState().player;
    expect(p.coins).toBe(100);
    expect(currentFrame(p)).toBe("prata");
    expect(screen.getByText("Em uso")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Moldura Prata com estrelinhas comprada e em uso!",
    );
    expect(tracked.find((e) => e.name === "frame_bought")?.params).toEqual({
      frame: "prata",
      price: 200,
    });
    // Tirar a moldura.
    fireEvent.click(screen.getByRole("button", { name: "Tirar moldura" }));
    expect(currentFrame(usePlayer.getState().player)).toBeUndefined();
  });
  it("a aba Itens continua com os itens da partida e o saldo", () => {
    open(300);
    fireEvent.click(screen.getByRole("tab", { name: "Itens" }));
    expect(screen.getByRole("list", { name: "Itens à venda" })).toBeVisible();
    expect(screen.getByText("Seu saldo")).toBeInTheDocument();
  });
});

describe("Avatares premium", () => {
  it("8 premium de 600 a 1.000 moedas, fora da lista gratuita, mas reconhecidos", () => {
    expect(PREMIUM_AVATARS.map((a) => a.id)).toEqual([
      "viking",
      "guerreira",
      "ninja",
      "samurai",
      "mago",
      "feiticeira",
      "rei",
      "rainha",
    ]);
    expect(Math.min(...Object.values(AVATAR_PRICES))).toBe(600);
    expect(Math.max(...Object.values(AVATAR_PRICES))).toBe(1000);
    expect(PLAYER_AVATARS.some((a) => a.id === "viking")).toBe(false);
    expect(avatarOf("rainha").id).toBe("rainha");
    expect(avatarOf("rainha").name).toBe("Rainha");
  });
  it("nenhum id de avatar se repete entre gratuitos, heróis e Índia (cada um tem sua arte)", () => {
    const ids = [...PLAYER_AVATARS, ...ALL_PREMIUM_AVATARS].map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(INDIA_AVATARS).toHaveLength(12);
    for (const a of ALL_PREMIUM_AVATARS)
      expect(AVATAR_PRICES[a.id]).toBeGreaterThan(0);
  });
  it("comprar desconta e passa a usar; só aparece para escolher depois de comprado", () => {
    const p = base(700);
    expect(pickableAvatars(p).some((a) => a.id === "ninja")).toBe(false);
    expect(buyAvatar(base(100), "viking").avatars).toBeUndefined();
    const bought = buyAvatar(p, "ninja");
    expect(bought.coins).toBe(0);
    expect(bought.avatar).toBe("ninja");
    expect(pickableAvatars(bought).some((a) => a.id === "ninja")).toBe(true);
    expect(buyAvatar(bought, "ninja")).toBe(bought);
    // Avatar gratuito não é vendido.
    expect(buyAvatar(p, "panda")).toBe(p);
  });
  it("vão para a nuvem e voltam somados", () => {
    const phone = buyAvatar(base(1000), "viking");
    const account = buyAvatar(base(1000), "rei");
    const merged = mergeCloud(phone, parseCloud(cloudText(account))!);
    expect(merged.avatars?.sort()).toEqual(["rei", "viking"]);
  });
  it("na loja, comprar um avatar premium o coloca em uso e mede", () => {
    usePlayer.setState({ player: base(650), ready: true });
    render(
      <MemoryRouter initialEntries={["/loja?aba=avatares"]}>
        <Shop />
      </MemoryRouter>,
    );
    expect(
      screen
        .getByRole("list", { name: "Avatares premium" })
        .querySelectorAll("li"),
    ).toHaveLength(20);
    // Sem filtros: uma grade só, do mais barato ao mais caro.
    const prices = [
      ...screen
        .getByRole("list", { name: "Avatares premium" })
        .querySelectorAll(".frames-price"),
    ].map((e) => Number(e.textContent));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(screen.queryByRole("group", { name: "Filtrar" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Comprar o avatar Viking por 600 moedas",
      }),
    );
    const p = usePlayer.getState().player;
    expect(p.avatar).toBe("viking");
    expect(p.coins).toBe(50);
    expect(tracked.find((e) => e.name === "avatar_bought")?.params).toEqual(
      expect.objectContaining({ avatar: "viking", price: 600 }),
    );
  });
});
