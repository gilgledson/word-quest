// Uso: node scripts/build-variants.mjs <levels-gerado-1.json> [<levels-gerado-2.json> ...]
// Junta grades alternativas das fases em src/data/level-variants.json ({ idDaFase: [palavras[], ...] }).
// Cada arquivo de entrada é uma cópia de levels.json regenerada com outro --seed
// (node scripts/generate-levels.mjs --only 2,...,25 --seed N --reuse --out <cópia>).
// A fase 1 (tutorial) fica de fora: as instruções apontam para palavras dela.
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const data = path.join(here, "..", "src", "data");
const levels = JSON.parse(
  fs.readFileSync(path.join(data, "levels.json"), "utf8"),
);
/** Uma variante só entra se até metade das palavras repetir as de outra grade da mesma fase. */
const MAX_SHARED = 0.5;
const answers = (words) => new Set(words.map((w) => w.answer));
const shared = (a, b) => [...a].filter((w) => b.has(w)).length / a.size;

const out = {};
for (const file of process.argv.slice(2)) {
  const generated = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const level of levels) {
    if (level.number === 1) continue;
    const alt = generated.find((l) => l.number === level.number);
    if (!alt) continue;
    const mine = answers(alt.words);
    const others = [level.words, ...(out[level.id] ?? [])].map(answers);
    const worst = Math.max(...others.map((o) => shared(mine, o)));
    if (worst > MAX_SHARED) {
      console.log(
        `fase ${level.number}: variante de ${path.basename(file)} descartada (${Math.round(worst * 100)}% repetida)`,
      );
      continue;
    }
    (out[level.id] ??= []).push(alt.words);
  }
}
fs.writeFileSync(
  path.join(data, "level-variants.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  Object.entries(out)
    .map(([id, list]) => `${id}: ${list.length}`)
    .join(" · "),
);
