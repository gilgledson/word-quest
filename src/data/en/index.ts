import levels from "./levels.json";
import casual from "./casual.json";
import variants from "./level-variants.json";
import worlds from "./worlds.json";
import castRaw from "./opponents.json";
import type { Catalog, CasualTheme, World } from "../catalog";
import type { Puzzle, PuzzleWord } from "../../game/crossword-engine";
import type { Cast } from "../../game/opponents";

/**
 * Conteúdo próprio do inglês (não é tradução): fases, variantes, temas do Casual, mundos e rivais,
 * gerados com `--lang en` pelos scripts (scripts/data/en). Só é carregado por quem joga em inglês.
 */
export const catalog: Catalog = {
  worlds: worlds as World[],
  levels: levels as Puzzle[],
  variants: variants as Record<string, PuzzleWord[][]>,
  casual: (casual as { themes: CasualTheme[] }).themes,
};
export const cast: Cast = castRaw as Cast;
