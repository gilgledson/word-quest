import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { setLang } from "../i18n";
import * as es from "../data/es";
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
import { finishesForFree } from "./solve";

const grids = () => [
  ...es.catalog.levels,
  ...es.catalog.levels.flatMap((l) =>
    (es.catalog.variants[l.id] ?? []).map((words) => ({ ...l, words })),
  ),
  ...es.catalog.casual.flatMap((t) => t.puzzles),
];

/** Conteúdo próprio do espanhol: entra no lugar do português quando o jogo está em espanhol. */
describe("conteúdo em espanhol", () => {
  beforeAll(async () => {
    setLang("es");
    await startContent();
  });
  afterAll(() => {
    setLang("pt");
    resetContent();
  });

  it("põe em uso as fases, os mapas, os temas e os rivais do espanhol", () => {
    expect(levels).toHaveLength(25);
    expect(levels[0].id).toBe("aldea-1");
    expect(maps.map((m) => m.nome)).toContain("Aldea de las Letras");
    expect(casualThemes.map((t) => t.nome)).toContain("Animales");
    expect(opponentById("bolota")?.name).toBe("Bellota");
    expect(OPPONENT_BY_LEVEL[25]).toBe("polvo");
    expect(dailyPuzzle("2026-11-24").world).toMatch(
      /aldea|bosque|desierto|castillo|islas/,
    );
  });

  it("os ids não se misturam com os do português nem com os do inglês", () => {
    const ids = (c: typeof bundledCatalog) => [
      ...c.levels.map((l) => l.id),
      ...c.casual.flatMap((t) => t.puzzles.map((p) => p.id)),
    ];
    const others = new Set([...ids(bundledCatalog), ...ids(en.catalog)]);
    expect(ids(es.catalog).filter((id) => others.has(id))).toEqual([]);
    const worlds = new Set([
      ...bundledCatalog.worlds.map((w) => w.id),
      ...en.catalog.worlds.map((w) => w.id),
    ]);
    expect(es.catalog.worlds.filter((w) => worlds.has(w.id))).toEqual([]);
  });

  it("passa na mesma validação do conteúdo baixado", () => {
    expect(
      validateContent({
        ...BUNDLED_CONTENT,
        version: 1, // como numa publicação em content-es
        catalog: es.catalog,
        cast: es.cast,
      }),
    ).toEqual([]);
  });

  it("cada fase, variante e grade do Casual chega ao fim só com ações gratuitas", () => {
    for (const p of es.catalog.levels)
      expect(PuzzleValidator.validateCatalog(p), p.id).toEqual([]);
    for (const p of grids()) expect(finishesForFree(p), p.id).toBe(true);
  });

  it("o Ñ entra nas grades como letra própria", () => {
    const answers = grids().flatMap((p) => p.words.map((w) => w.answer));
    expect(answers.every((a) => /^[A-ZÑ]+$/.test(a))).toBe(true);
    expect(answers.some((a) => a.includes("Ñ"))).toBe(true);
  });

  it("os temas do Casual usam a arte que já vem no app", () => {
    expect(es.catalog.casual).toHaveLength(8);
    for (const t of es.catalog.casual) expect(t.art).toMatch(/^\/art\/temas\//);
  });

  it("publica em content-es", () => {
    expect(contentPath("es")).toBe("content-es");
  });
});
