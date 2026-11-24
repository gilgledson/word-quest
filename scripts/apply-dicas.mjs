// Pistas completas (o texto do painel da palavra selecionada; a `pista` curta fica na casa da grade).
//
// Uso:
//   node scripts/apply-dicas.mjs [arquivo.txt ...]   lê linhas PALAVRA|pista completa, valida e grava no
//                                                     catálogo; depois copia as dicas do catálogo para as
//                                                     fases e variantes (src/data/levels.json e
//                                                     level-variants.json)
//   node scripts/apply-dicas.mjs                      só sincroniza fases e variantes com o catálogo
//
// Regras (as mesmas do app, PuzzleValidator): até MAX_DICA caracteres e sem a resposta dentro.
import fs from "node:fs";
import path from "node:path";
import { loadCatalog, loadDictionary, validateEntry } from "./check-clues.mjs";
import { appData, scriptData } from "./lib/lang.mjs";

const data = appData;
const catalog = loadCatalog();
const byWord = new Map(catalog.map((e) => [e.palavra, e]));
const dictionary = loadDictionary();
const problems = [];
let added = 0;
for (const file of process.argv.slice(2)) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const [palavra, dica] = line.split("|").map((s) => s.trim());
    const entry = byWord.get(palavra);
    if (!entry) {
      problems.push(`${palavra}: fora do catálogo`);
      continue;
    }
    // Valida a entrada inteira com a dica nova (a pista curta já era válida).
    const why = validateEntry({ ...entry, dica }, dictionary, new Map());
    if (why) problems.push(`${palavra}: ${why}: ${dica}`);
    else {
      entry.dica = dica;
      added++;
    }
  }
}
if (process.argv.length > 2) {
  // Mantém a ordem e o formato do arquivo (uma chave por linha, como o prettier deixa): o diff mostra só
  // as dicas novas.
  fs.writeFileSync(
    path.join(scriptData, "catalogo.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  console.log(`${added} dicas gravadas no catálogo`);
}

// Fases e variantes: cada palavra recebe a dica atual do catálogo (ou perde a que não existe mais).
const sync = (words) => {
  let missing = 0;
  for (const w of words) {
    const dica = byWord.get(w.answer)?.dica;
    if (dica) w.dica = dica;
    else {
      delete w.dica;
      missing++;
    }
  }
  return missing;
};
const levelsPath = path.join(data, "levels.json");
const variantsPath = path.join(data, "level-variants.json");
const levels = JSON.parse(fs.readFileSync(levelsPath, "utf8"));
const variants = JSON.parse(fs.readFileSync(variantsPath, "utf8"));
let missing = 0;
for (const level of levels) missing += sync(level.words);
for (const list of Object.values(variants))
  for (const words of list) missing += sync(words);
fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2) + "\n");
fs.writeFileSync(variantsPath, JSON.stringify(variants, null, 2) + "\n");
console.log(`fases e variantes sincronizadas; ${missing} palavras sem dica`);
if (problems.length) {
  console.error(`${problems.length} dicas recusadas:\n${problems.join("\n")}`);
  process.exitCode = 1;
}
