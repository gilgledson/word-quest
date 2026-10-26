import raw from "./levels.json";
import casualRaw from "./casual.json";
import type { Puzzle } from "../game/crossword-engine";
export const levels = raw as Puzzle[];
export interface CasualTheme {
  id: string;
  nome: string;
  puzzles: Puzzle[];
}
/** Modo casual: grades pré-geradas por tema (scripts/generate-casual.mjs). */
export const casualThemes = (casualRaw as { themes: CasualTheme[] }).themes;
export const casualPuzzles = casualThemes.flatMap((t) => t.puzzles);
export const isCasual = (id: string | undefined) => !!id?.startsWith("casual-");
export const worlds = [
  "Vila das Palavras",
  "Floresta dos Enigmas",
  "Deserto dos Mistérios",
  "Reino dos Sábios",
  "Ilhas do Conhecimento",
];
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dailyPuzzle = (date: string) =>
  levels[
    Math.abs([...date].reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) %
      levels.length
  ];
/** Mapas de fases: cada mundo tem a própria ilustração e fases consecutivas (número global). */
export const maps = [
  {
    id: "vila",
    nome: worlds[0],
    art: "/art/map-straight-v1.jpg",
    path: "/map",
    start: "Início da jornada",
  },
  {
    id: "floresta",
    nome: worlds[1],
    art: "/art/map-forest-v1.jpg",
    path: "/map/floresta",
    start: "Início da floresta",
  },
  {
    id: "deserto",
    nome: worlds[2],
    art: "/art/map-desert-v1.jpg",
    path: "/map/deserto",
    start: "Início do deserto",
  },
  {
    id: "reino",
    nome: worlds[3],
    art: "/art/map-kingdom-v1.jpg",
    path: "/map/reino",
    start: "Início do reino",
  },
  {
    id: "ilhas",
    nome: worlds[4],
    art: "/art/map-islands-v1.jpg",
    path: "/map/ilhas",
    start: "Início das ilhas",
  },
];
export const mapOf = (world: string | undefined) =>
  maps.find((m) => m.id === world) ?? maps[0];
export const worldLevels = (world: string) =>
  levels.filter((l) => l.world === world);
