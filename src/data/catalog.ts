import raw from "./levels.json";
import casualRaw from "./casual.json";
import variantsRaw from "./level-variants.json";
import worldsRaw from "./worlds.json";
import type { Puzzle, PuzzleWord } from "../game/crossword-engine";

/**
 * Catálogo de fases, mundos e temas. Começa com o conteúdo que vem dentro do app e pode ser
 * trocado por um conteúdo baixado (src/content), sempre na abertura do app, antes da primeira
 * tela: as listas abaixo são as mesmas durante toda a sessão e são atualizadas no lugar, então
 * quem as importou enxerga a versão em uso.
 */
export interface World {
  id: string;
  nome: string;
  /** Ilustração do mapa: caminho dentro do app (/art/...) ou endereço do conteúdo baixado. */
  art: string;
  /** Texto da placa no começo do caminho. */
  start: string;
}
export interface WorldMapInfo extends World {
  /** Rota do mapa: o primeiro mundo fica em /map. */
  path: string;
}
export interface CasualTheme {
  id: string;
  nome: string;
  /** Ilustração do card; sem ela vale public/art/temas/<id>.webp. */
  art?: string;
  /** Cor do tema (selo, borda e barra); sem ela, as cores fixas de casual.css. */
  color?: string;
  colorSoft?: string;
  puzzles: Puzzle[];
}
export interface Catalog {
  worlds: World[];
  levels: Puzzle[];
  /** Grades alternativas de cada fase (só as palavras; o resto vem da fase). */
  variants: Record<string, PuzzleWord[][]>;
  casual: CasualTheme[];
}
/** O conteúdo que vem dentro do app. */
export const bundledCatalog: Catalog = {
  worlds: worldsRaw as World[],
  levels: raw as Puzzle[],
  variants: variantsRaw as Record<string, PuzzleWord[][]>,
  casual: (casualRaw as { themes: CasualTheme[] }).themes,
};

export const levels: Puzzle[] = [];
/** Só as grades alternativas, na ordem das fases. */
export const levelVariants: Puzzle[] = [];
/** Modo casual: grades pré-geradas por tema (scripts/generate-casual.mjs). */
export const casualThemes: CasualTheme[] = [];
export const casualPuzzles: Puzzle[] = [];
/** Mapas de fases: cada mundo tem a própria ilustração e fases consecutivas (número global). */
export const maps: WorldMapInfo[] = [];
/** Nomes dos mundos, na ordem do mapa. */
export const worlds: string[] = [];
/**
 * Grades de cada fase: a original e as alternativas (scripts/build-variants.mjs). A fase é a mesma
 * (id, número, rival); só mudam as palavras, para a revanche não repetir uma grade já conhecida.
 */
let grids: Record<string, Puzzle[]> = {};
/** Todas as grades da campanha, as originais primeiro: o sorteio do desafio diário. */
let dailyPool: Puzzle[] = [];

const fill = <T>(list: T[], items: T[]) => {
  list.splice(0, list.length, ...items);
};
/** Põe um catálogo em uso. Só deve rodar antes da primeira tela (ver src/content). */
export function setCatalog(c: Catalog) {
  fill(levels, c.levels);
  grids = Object.fromEntries(
    c.levels.map((level) => [
      level.id,
      [
        level,
        ...(c.variants[level.id] ?? []).map((words) => ({ ...level, words })),
      ],
    ]),
  );
  fill(
    levelVariants,
    c.levels.flatMap((level) => grids[level.id].slice(1)),
  );
  dailyPool = [...levels, ...levelVariants];
  fill(casualThemes, c.casual);
  fill(
    casualPuzzles,
    c.casual.flatMap((t) => t.puzzles),
  );
  fill(
    maps,
    c.worlds.map((w, i) => ({ ...w, path: i ? `/map/${w.id}` : "/map" })),
  );
  fill(
    worlds,
    c.worlds.map((w) => w.nome),
  );
}
setCatalog(bundledCatalog);

/** Quantas grades a fase tem (1 = só a original). */
export const variantCount = (id: string) => grids[id]?.length ?? 1;
/** A grade da fase na variante pedida (0 = a original); o índice dá a volta. */
export const levelGrid = (id: string | undefined, variant = 0) => {
  const list = id ? grids[id] : undefined;
  return list?.[variant % list.length];
};
export const isCasual = (id: string | undefined) => !!id?.startsWith("casual-");
/**
 * Partida casual num tamanho que os temas não têm (eles só têm o 8×10): usa uma grade da Aventura
 * (fase e variante) com id próprio, "casual-livre-<fase>-<variante>". Assim ela conta como casual
 * (sem estrelas nem progresso de fase) e a sessão não se mistura com a da Aventura.
 */
export const FREE_CASUAL = "casual-livre-";
export const freeCasualId = (levelId: string, variant: number) =>
  `${FREE_CASUAL}${levelId}-${variant}`;
/** A grade de uma partida casual: a de um tema ou a da Aventura de "casual-livre-…". */
export function casualGrid(id: string | undefined): Puzzle | undefined {
  const themed = casualPuzzles.find((p) => p.id === id);
  if (themed || !id?.startsWith(FREE_CASUAL)) return themed;
  const m = /^(.+)-(\d+)$/.exec(id.slice(FREE_CASUAL.length));
  const grid = m ? levelGrid(m[1], Number(m[2])) : undefined;
  return grid && { ...grid, id };
}

export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dailyPuzzle = (date: string) =>
  dailyPool[
    Math.abs([...date].reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) %
      dailyPool.length
  ];
export const mapOf = (world: string | undefined) =>
  maps.find((m) => m.id === world) ?? maps[0];
export const worldLevels = (world: string) =>
  levels.filter((l) => l.world === world);
/** Ilustração do tema: a do conteúdo ou a que vem no app. */
export const themeArt = (t: Pick<CasualTheme, "id" | "art">) =>
  t.art ?? `/art/temas/${t.id}.webp`;
/** Cores do tema vindas do conteúdo (os temas do app usam as de casual.css). */
export const themeColors = (t: Pick<CasualTheme, "color" | "colorSoft">) =>
  t.color
    ? ({
        "--theme": t.color,
        "--theme-soft": t.colorSoft ?? t.color,
      } as Record<string, string>)
    : undefined;
