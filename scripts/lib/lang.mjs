// Idioma do conteúdo nos scripts: `--lang en|es` (ou WQ_LANG=en) usa scripts/data/<idioma>/ como
// entrada e grava em src/data/<idioma>/; sem nada, o português de sempre (scripts/data/ e src/data/).
import path from "node:path";

const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const argv = process.argv;
const at = argv.indexOf("--lang");
export const LANG = (at >= 0 ? argv[at + 1] : process.env.WQ_LANG) || "pt";
if (!["pt", "en", "es"].includes(LANG)) {
  console.error(`Idioma desconhecido: ${LANG} (use pt, en ou es)`);
  process.exit(1);
}
const sub = LANG === "pt" ? [] : [LANG];
/** Entradas dos scripts (catálogo, temas, dicionário). */
export const scriptData = path.join(here, "..", "data", ...sub);
/** Conteúdo do app (fases, variantes, casual, mundos, rivais). */
export const appData = path.join(here, "..", "..", "src", "data", ...sub);

/**
 * Tira os acentos (Á vira A, Ç vira C), mas o Ñ fica: no espanhol é uma letra própria. O português
 * e o inglês não têm Ñ, então para eles nada muda.
 */
export const strip = (s) =>
  s
    .normalize("NFD")
    .replace(/(?<![nN])\u0303|[\u0300-\u0302\u0304-\u036f]/g, "")
    .normalize("NFC");
/** Palavra válida na grade (só letras, maiúsculas; o Ñ conta como letra). */
export const WORD_RE = /^[A-ZÑ]+$/;
