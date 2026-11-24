import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { setLang } from "../i18n";
import * as en from "../data/en";
import {
  bundledCatalog,
  casualThemes,
  dailyPuzzle,
  levels,
  maps,
} from "../data/catalog";
import { opponentById, OPPONENT_BY_LEVEL } from "../game/opponents";
import {
  BUNDLED_CONTENT,
  contentPath,
  resetContent,
  startContent,
} from "../content/content";
import { validateContent } from "../content/validate";
import { PuzzleValidator } from "../game/crossword-engine";
import { roomLang } from "../game/online";
import { finishesForFree } from "./solve";

/** Conteúdo próprio do inglês: entra no lugar do português quando o jogo está em inglês. */
describe("conteúdo em inglês", () => {
  beforeAll(async () => {
    setLang("en");
    await startContent();
  });
  afterAll(() => {
    setLang("pt");
    resetContent();
  });

  it("põe em uso as fases, os mapas, os temas e os rivais do inglês", () => {
    expect(levels).toHaveLength(25);
    expect(levels[0].id).toBe("village-1");
    expect(maps.map((m) => m.nome)).toContain("Letter Village");
    expect(casualThemes.map((t) => t.nome)).toContain("Animals");
    expect(opponentById("bolota")?.name).toBe("Acorn");
    expect(OPPONENT_BY_LEVEL[25]).toBe("polvo");
    expect(dailyPuzzle("2026-11-24").world).toMatch(
      /village|forest|desert|kingdom|islands/,
    );
  });

  it("os ids não se misturam com os do português (progresso separado)", () => {
    const pt = new Set([
      ...bundledCatalog.levels.map((l) => l.id),
      ...bundledCatalog.casual.flatMap((t) => t.puzzles.map((p) => p.id)),
    ]);
    const mine = [
      ...en.catalog.levels.map((l) => l.id),
      ...en.catalog.casual.flatMap((t) => t.puzzles.map((p) => p.id)),
    ];
    expect(mine.filter((id) => pt.has(id))).toEqual([]);
  });

  it("passa na mesma validação do conteúdo baixado", () => {
    expect(
      validateContent({
        ...BUNDLED_CONTENT,
        version: 1, // como numa publicação em content-en
        catalog: en.catalog,
        cast: en.cast,
      }),
    ).toEqual([]);
  });

  it("cada fase e cada grade do Casual chega ao fim só com ações gratuitas", () => {
    const grids = [
      ...en.catalog.levels,
      ...en.catalog.levels.flatMap((l) =>
        (en.catalog.variants[l.id] ?? []).map((words) => ({ ...l, words })),
      ),
      ...en.catalog.casual.flatMap((t) => t.puzzles),
    ];
    for (const p of en.catalog.levels)
      expect(PuzzleValidator.validateCatalog(p), p.id).toEqual([]);
    for (const p of grids) expect(finishesForFree(p), p.id).toBe(true);
  });

  it("os temas do Casual em inglês usam a arte que já vem no app", () => {
    for (const t of en.catalog.casual) expect(t.art).toMatch(/^\/art\/temas\//);
  });

  it("publica em content-en; o português segue em content", () => {
    expect(contentPath("pt")).toBe("content");
    expect(contentPath("en")).toBe("content-en");
  });
});

describe("idioma no duelo", () => {
  it("sala sem idioma é das versões antigas: português", () => {
    expect(roomLang({})).toBe("pt");
    expect(roomLang({ lang: "en" })).toBe("en");
  });
});
