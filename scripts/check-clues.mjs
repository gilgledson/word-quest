// Valida o catálogo de palavras e pistas (scripts/data/catalogo.json; ver scripts/catalogo.mjs).
// Regras: palavra no dicionário, pista ≤18 caracteres, palavras ≤9 letras, cabe em 2 linhas de 9
// caracteres (metade de uma célula dupla), sem a resposta dentro da pista e sem pistas repetidas.
// Uso: node scripts/check-clues.mjs
import fs from "node:fs";
import path from "node:path";

const dir = path.join(
  path.dirname(
    new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  ),
  "data",
);
const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export const MAX_CLUE = 18;
export const MAX_TOKEN = 9;
export const MAX_LINES = 2;
export const lineCount = (clue, width = MAX_TOKEN) => {
  let lines = 1;
  let used = 0;
  for (const token of clue.split(" ")) {
    if (used && used + 1 + token.length > width) {
      lines++;
      used = token.length;
    } else used += (used ? 1 : 0) + token.length;
  }
  return lines;
};
export const NIVEIS = ["facil", "medio", "dificil"];
const NIVEL_TIER = { facil: 1, medio: 2, dificil: 3 };
export { strip, dir };
const catalogPath = path.join(dir, "catalogo.json");
export const loadDictionary = () => {
  const dictionaryPath = path.join(dir, "dictionary.txt");
  if (!fs.existsSync(dictionaryPath)) {
    console.error(
      "Falta scripts/data/dictionary.txt: rode scripts/build-dictionary.mjs (ver scripts/README.md).",
    );
    process.exit(1);
  }
  return new Set(
    fs.readFileSync(dictionaryPath, "utf8").split("\n").filter(Boolean),
  );
};
/** Catálogo: lista de { palavra, pista, nivel, tipo } (uma entrada por linha no arquivo). */
export const loadCatalog = () =>
  fs.existsSync(catalogPath)
    ? JSON.parse(fs.readFileSync(catalogPath, "utf8"))
    : [];
export const saveCatalog = (list) =>
  fs.writeFileSync(
    catalogPath,
    "[\n" +
      [...list]
        .sort((a, b) => a.palavra.localeCompare(b.palavra))
        .map((e) =>
          JSON.stringify({
            palavra: e.palavra,
            pista: e.pista,
            nivel: e.nivel,
            tipo: e.tipo,
          }),
        )
        .join(",\n") +
      "\n]\n",
  );
/** Motivo pelo qual a entrada não serve, ou null. `pistas`: pistas já usadas (texto → palavra). */
export function validateEntry(e, dictionary, pistas) {
  const { palavra: word, pista: clue } = e;
  if (!clue) return "sem pista";
  if (!dictionary.has(word)) return "fora do dicionário";
  if (clue.length > MAX_CLUE) return `pista longa (${clue.length})`;
  if (clue.split(" ").some((t) => t.length > MAX_TOKEN))
    return "palavra longa na pista";
  if (lineCount(clue) > MAX_LINES) return "não cabe em 2 linhas";
  if (word.length > 3 && strip(clue).toUpperCase().includes(word))
    return "pista contém a resposta";
  const key = strip(clue).toLowerCase();
  if (pistas.has(key) && pistas.get(key) !== word)
    return `igual à pista de ${pistas.get(key)}`;
  return null;
}
export function validateClues() {
  const dictionary = loadDictionary();
  const catalog = loadCatalog();
  const entries = new Map(catalog.map((e) => [e.palavra, e]));
  const problems = [];
  const valid = [];
  const seenClue = new Map();
  for (const e of catalog) {
    const why = validateEntry(e, dictionary, seenClue);
    if (why) problems.push(`${e.palavra}: ${why}: ${e.pista}`);
    else {
      seenClue.set(strip(e.pista).toLowerCase(), e.palavra);
      valid.push({
        word: e.palavra,
        clue: e.pista,
        tier: NIVEL_TIER[e.nivel] ?? 1,
        nivel: e.nivel,
        tipo: e.tipo,
      });
    }
  }
  return { files: ["catalogo.json"], entries, valid, problems, dictionary };
}
if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  const { valid, problems } = validateClues();
  console.log(`${valid.length} palavras válidas, ${problems.length} problemas`);
  console.log(problems.join("\n"));
}
