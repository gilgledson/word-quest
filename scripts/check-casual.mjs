// Valida as grades do modo casual (src/data/casual.json) contra o catálogo: quantas respostas de cada
// grade são do tema (tipo) escolhido, quais não são e se há grades repetidas dentro do tema.
// Uso: node scripts/check-casual.mjs [--min 0.8]   (sai com erro se alguma grade ficar abaixo do mínimo)
import fs from "node:fs";
import path from "node:path";
import { loadCatalog, dir } from "./check-clues.mjs";

const args = process.argv.slice(2);
const min = Number(args[args.indexOf("--min") + 1] || 0);
const casual = JSON.parse(
  fs.readFileSync(
    path.join(dir, "..", "..", "src", "data", "casual.json"),
    "utf8",
  ),
);
const tipo = new Map(loadCatalog().map((e) => [e.palavra, e.tipo]));
let abaixo = 0;
for (const theme of casual.themes) {
  const vistos = new Map();
  theme.puzzles.forEach((g, i) => {
    const respostas = g.words.map((w) => w.answer);
    const doTema = respostas.filter((w) => tipo.get(w) === theme.id);
    const parte = doTema.length / respostas.length;
    const chave = respostas.slice().sort().join(",");
    const igual = vistos.get(chave);
    vistos.set(chave, i);
    if (parte < min) abaixo++;
    console.log(
      `${theme.id} #${i}: ${doTema.length}/${respostas.length} do tema (${(parte * 100).toFixed(0)}%)` +
        (igual !== undefined ? `  IGUAL à #${igual}` : "") +
        (parte < min ? "  ABAIXO" : ""),
    );
  });
}
if (abaixo) {
  console.error(`${abaixo} grades abaixo de ${min * 100}% de palavras do tema`);
  process.exit(1);
}
