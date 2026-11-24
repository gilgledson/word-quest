// Idioma do conteúdo nos scripts: `--lang en` (ou WQ_LANG=en) usa scripts/data/en/ como entrada e
// grava em src/data/en/; sem nada, o português de sempre (scripts/data/ e src/data/).
import path from "node:path";

const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const argv = process.argv;
const at = argv.indexOf("--lang");
export const LANG = (at >= 0 ? argv[at + 1] : process.env.WQ_LANG) || "pt";
if (!["pt", "en"].includes(LANG)) {
  console.error(`Idioma desconhecido: ${LANG} (use pt ou en)`);
  process.exit(1);
}
const sub = LANG === "pt" ? [] : [LANG];
/** Entradas dos scripts (catálogo, temas, dicionário). */
export const scriptData = path.join(here, "..", "data", ...sub);
/** Conteúdo do app (fases, variantes, casual, mundos, rivais). */
export const appData = path.join(here, "..", "..", "src", "data", ...sub);
