import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUNDLED_CONTENT,
  contentImages,
  contentVersion,
  refreshContent,
  resetContent,
  startContent,
  upcomingImages,
} from "../content/content";
import { assetNow, prefetchAssets, resetAssets } from "../content/assets";
import {
  validArt,
  validateContent,
  type GameContent,
} from "../content/validate";
import {
  casualThemes,
  dailyPuzzle,
  levelGrid,
  levels,
  maps,
  mapOf,
} from "../data/catalog";
import { OPPONENTS, opponentFace, opponentFor } from "../game/opponents";
import { ACHIEVEMENTS } from "../game/achievements";
import { Casual, Campaign } from "../features/pages";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { contentStore, initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

const HOST = "https://wordquest-online.web.app";
/** Conteúdo publicado de exemplo: o do app mais um mundo, um rival e um tema novos. */
function published(version = 3): GameContent {
  const base = structuredClone(BUNDLED_CONTENT);
  const last = base.catalog.levels.at(-1)!;
  const extra = base.catalog.levels.slice(1, 6).map((l, i) => ({
    ...structuredClone(l),
    id: `vulcao-${last.number + i + 1}`,
    number: last.number + i + 1,
    world: "vulcao",
  }));
  return {
    ...base,
    version,
    catalog: {
      ...base.catalog,
      worlds: [
        ...base.catalog.worlds,
        {
          id: "vulcao",
          nome: "Vulcão das Rimas",
          art: `${HOST}/art/mapas/vulcao-v1.jpg`,
          start: "Início do vulcão",
        },
      ],
      levels: [...base.catalog.levels, ...extra],
      casual: [
        ...base.catalog.casual,
        {
          id: "viagem",
          nome: "Viagem",
          art: `${HOST}/art/temas/viagem-v1.webp`,
          color: "#0a7d8c",
          colorSoft: "#d3f1f4",
          puzzles: base.catalog.casual[0].puzzles.slice(0, 2).map((p, i) => ({
            ...structuredClone(p),
            id: `casual-viagem-${i + 1}`,
          })),
        },
      ],
    },
    cast: {
      opponents: [
        ...base.cast.opponents,
        {
          id: "brasa",
          name: "Brasa",
          species: "salamandra",
          level: "dificil",
          style: "agressivo",
          tagline: "Quente como lava.",
          win: "Derreti as suas palavras!",
          lose: "Esfriei...",
          boss: true,
          art: `${HOST}/art/rivais/brasa-v1`,
        },
      ],
      byLevel: {
        ...base.cast.byLevel,
        ...Object.fromEntries(
          extra.map((l, i) => [String(l.number), i === 4 ? "brasa" : "draco"]),
        ),
      },
    },
  };
}
/** Servidor falso: responde a versão, o conteúdo (texto JSON) e as imagens. */
function serve(content: GameContent | null, images: string[] = []) {
  // Respostas simples: o Response do Node não guarda o tipo de um Blob do jsdom.
  const ok = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
    blob: async () => new Blob(["img"], { type: "image/webp" }),
  });
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/content/version.json"))
      return ok(content?.version ?? null);
    if (url.endsWith("/content/data.json")) return ok(JSON.stringify(content));
    if (images.includes(url)) return ok(null);
    return { ok: false, status: 404 };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const clearCache = async () => {
  await contentStore.save(undefined);
  await contentStore.pruneAssets(new Set());
};

beforeEach(async () => {
  resetContent();
  resetAssets();
  await clearCache();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: (b: Blob) => `blob:${b.size}` }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetContent();
});

describe("Validação do conteúdo", () => {
  it("o conteúdo que vem no app passa (como se fosse uma publicação)", () => {
    expect(validateContent({ ...BUNDLED_CONTENT, version: 1 })).toEqual([]);
    expect(validateContent(published())).toEqual([]);
  });
  it("recusa referências quebradas, formatos novos e imagens de outros servidores", () => {
    const c = published();
    c.cast.byLevel["2"] = "ninguem";
    c.catalog.levels[3].world = "lua";
    c.catalog.casual[0].puzzles[0].id = "sem-prefixo";
    c.cast.opponents[0].art = "https://exemplo.com/rosto";
    const errors = validateContent(c).join(" | ");
    expect(errors).toContain("fase 2: rival inexistente");
    expect(errors).toContain("mundo inexistente");
    expect(errors).toContain('id de grade sem "casual-"');
    expect(errors).toContain("imagem não permitida");
    expect(validateContent({ ...published(), schema: 2 })).not.toEqual([]);
    expect(validateContent({ ...published(), version: 0 })).not.toEqual([]);
  });
  it("recusa grades quebradas e variantes no tutorial", () => {
    const c = published();
    c.catalog.levels[4].words[0].answer = "X";
    c.catalog.variants[c.catalog.levels[0].id] = [c.catalog.levels[0].words];
    const errors = validateContent(c).join(" | ");
    expect(errors).toContain(c.catalog.levels[4].id);
    expect(errors).toContain("fase 1 com variantes");
  });
  it("só aceita imagens do app ou do servidor de conteúdo", () => {
    expect(validArt("/art/temas/casa.webp")).toBe(true);
    expect(validArt(`${HOST}/art/x.webp`)).toBe(true);
    expect(validArt(`${HOST}/../x.webp`)).toBe(false);
    expect(validArt("https://outro.app/x.webp")).toBe(false);
    expect(validArt("javascript:alert(1)")).toBe(false);
  });
});

describe("Conteúdo baixado na abertura", () => {
  it("sem nada guardado, vale o conteúdo do app", async () => {
    await startContent();
    expect(contentVersion()).toBe(0);
    expect(levels).toHaveLength(25);
  });
  it("o conteúdo guardado entra antes da primeira tela: mundo, fases, rival e tema novos", async () => {
    await contentStore.save(published(3));
    await startContent();
    expect(contentVersion()).toBe(3);
    expect(levels).toHaveLength(30);
    expect(maps.at(-1)).toMatchObject({ id: "vulcao", path: "/map/vulcao" });
    expect(mapOf("vulcao").nome).toBe("Vulcão das Rimas");
    expect(casualThemes.at(-1)?.id).toBe("viagem");
    expect(OPPONENTS.some((o) => o.id === "brasa")).toBe(true);
    expect(
      opponentFor({ puzzleId: "vulcao-30", number: 30, mode: "campaign" }).id,
    ).toBe("brasa");
    expect(opponentFace("brasa", "happy")).toBe(
      `${HOST}/art/rivais/brasa-v1-happy.webp`,
    );
    // Totais lidos na hora: o chefe novo entra na conquista "todos os chefes".
    expect(ACHIEVEMENTS.find((a) => a.id === "chefes-todos")?.goal).toBe(6);
    // O resto continua igual.
    expect(levelGrid(levels[1].id, 1)).toBeDefined();
    expect(dailyPuzzle("2027-01-01")).toBeDefined();
  });
  it("conteúdo guardado inválido é ignorado", async () => {
    const broken = published(4);
    broken.cast.byLevel["1"] = "ninguem";
    await contentStore.save(broken);
    await startContent();
    expect(contentVersion()).toBe(0);
  });
});

describe("Conferência do servidor", () => {
  const player = structuredClone(initialPlayer);
  it("versão nova: baixa, valida e guarda para a próxima abertura (sem trocar a atual)", async () => {
    serve(published(5));
    expect(await refreshContent(player)).toBe("stored");
    expect(contentVersion()).toBe(0);
    expect(((await contentStore.load()) as GameContent).version).toBe(5);
    await startContent();
    expect(contentVersion()).toBe(5);
  });
  it("mesma versão ou sem publicação: não baixa o conteúdo", async () => {
    const f = serve(null);
    expect(await refreshContent(player)).toBe("current");
    expect(
      f.mock.calls.map(([u]) => u).some((u) => u.endsWith("data.json")),
    ).toBe(false);
  });
  it("conteúdo inválido no servidor não é guardado", async () => {
    const bad = published(6);
    bad.catalog.worlds = [];
    serve(bad);
    expect(await refreshContent(player)).toBe("invalid");
    expect(await contentStore.load()).toBeUndefined();
  });
  it("sem internet, segue com o que tem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await refreshContent(player)).toBe("offline");
  });
});

describe("Imagens do conteúdo", () => {
  it("baixa uma vez, guarda no aparelho e serve de lá depois", async () => {
    const url = `${HOST}/art/mapas/vulcao-v1.jpg`;
    const f = serve(null, [url]);
    await prefetchAssets([url, "/art/map-forest-v1.jpg"]);
    expect(assetNow(url)).toMatch(/^blob:/);
    expect(await contentStore.asset(url)).toBeTruthy();
    resetAssets();
    f.mockClear();
    await prefetchAssets([url]);
    expect(assetNow(url)).toMatch(/^blob:/);
    expect(f).not.toHaveBeenCalled();
  });
  it("adianta só o que o jogador vai ver logo: o próximo mundo e os temas", () => {
    const c = published();
    const all = contentImages(c);
    expect(all).toContain(`${HOST}/art/rivais/brasa-v1-sad.webp`);
    const beginner = upcomingImages(c, structuredClone(initialPlayer));
    expect(beginner).toContain(`${HOST}/art/temas/viagem-v1.webp`);
    expect(beginner).not.toContain(`${HOST}/art/mapas/vulcao-v1.jpg`);
    const stars = Object.fromEntries(
      c.catalog.levels.slice(0, 21).map((l) => [l.id, 1]),
    );
    const late = upcomingImages(c, {
      ...structuredClone(initialPlayer),
      stars,
    });
    expect(late).toContain(`${HOST}/art/mapas/vulcao-v1.jpg`);
    expect(late).toContain(`${HOST}/art/rivais/brasa-v1-neutral.webp`);
  });
  it("rosto de rival baixado: provisório até chegar, depois a arte", async () => {
    await contentStore.save(published());
    await startContent();
    const face = opponentFace("brasa", "neutral");
    serve(null, [face]);
    const { container } = render(<OpponentAvatar opponent={{ id: "brasa" }} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg/);
    await waitFor(() => expect(img.getAttribute("src")).toMatch(/^blob:/));
  });
  it("tema e mundo novos aparecem nas telas com a arte baixada", async () => {
    const c = published();
    await contentStore.save(c);
    await startContent();
    serve(null, contentImages(c));
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    const { container } = render(
      <MemoryRouter>
        <Casual />
      </MemoryRouter>,
    );
    const card = container.querySelector(
      '[data-theme="viagem"]',
    ) as HTMLElement;
    expect(card).toHaveTextContent("Viagem");
    expect(card.style.getPropertyValue("--theme")).toBe("#0a7d8c");
    await waitFor(() =>
      expect(card.querySelector("img")?.getAttribute("src")).toMatch(/^blob:/),
    );
    cleanup();
    await act(async () => {
      render(
        <MemoryRouter>
          <Campaign world="vulcao" />
        </MemoryRouter>,
      );
    });
    // O mapa do mundo novo traz as fases dele, com o chefe novo na última.
    expect(screen.getByLabelText(/^Fase 30, chefe Brasa/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        document.querySelector(".campaign-art")?.getAttribute("src"),
      ).toMatch(/^blob:/),
    );
  });
});
