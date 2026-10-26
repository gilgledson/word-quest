// Uso: node scripts/generate-casual.mjs [--themes animais,comida] [--count 6] [--min 8] [--pool 400]
//        [--seed 1] [--out src/data/casual.json] [--dry]
// Gera as grades do modo casual. Primeiro cria um conjunto de grades densas 8×10 (mesmas regras das
// fases, vocabulário geral); depois, para cada tema (scripts/data/themes.json), troca respostas por
// palavras do tipo (tema) no catálogo que encaixem nos cruzamentos já fixados e fica com as grades de mais palavras do tema.
import fs from "node:fs";
import path from "node:path";
import { ROWS, COLS, makeMold, solve, rng } from "./lib/arrowword.mjs";
import { validateClues } from "./check-clues.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--"))
      acc.push([
        a.slice(2),
        all[i + 1]?.startsWith("--") || all[i + 1] === undefined
          ? true
          : all[i + 1],
      ]);
    return acc;
  }, []),
);
const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const out = args.out ?? path.join(here, "..", "src", "data", "casual.json");
const count = Number(args.count ?? 6);
const minTheme = Number(args.min ?? 8);
const tries = Number(args.tries ?? 25);
const poolSize = Number(args.pool ?? 400);
const seed = Number(args.seed ?? 1);
const themes = JSON.parse(
  fs.readFileSync(path.join(here, "data", "themes.json"), "utf8"),
);
const wanted = args.themes
  ? String(args.themes).split(",")
  : Object.keys(themes);
const OBSCURE = new Set("URU GNU IPE OSA OVA FEL AVO UAI HUM EGO".split(" "));
const { valid } = validateClues();
const all = new Map(
  valid
    .filter((e) => !OBSCURE.has(e.word) && e.tier === 1)
    .map((e) => [e.word, e]),
);
const byLen = {};
for (const w of all.keys()) (byLen[w.length] ??= []).push(w);

// 1) Conjunto de grades-base (reaproveitado entre os temas). Com --make-base <arquivo> só gera e
// grava esse conjunto (rode vários processos com sementes diferentes em paralelo); sem isso, lê
// scripts/data/base/*.json.
const rand = rng(seed * 104729);
const baseDir = path.join(here, "data", "base");
let base = [];
if (args["make-base"]) {
  let molds = 0;
  while (base.length < poolSize) {
    molds++;
    const mold = makeMold(rand, { maxTwo: 5, minAvg: 3.4 });
    if (!mold) continue;
    const res = solve(mold, byLen, rand, { maxNodes: 4000 });
    if (!res.failed)
      base.push({ mold, words: [...res.words], letters: res.letters });
  }
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(
    path.join(baseDir, String(args["make-base"])),
    JSON.stringify(base),
  );
  console.log(`${base.length} grades-base (${molds} moldes)`);
  process.exit(0);
}
for (const f of fs.readdirSync(baseDir).filter((f) => f.endsWith(".json")))
  base.push(...JSON.parse(fs.readFileSync(path.join(baseDir, f), "utf8")));
const before = base.length;
// Grades-base antigas podem ter palavras que perderam a pista; descarta essas.
base = base.filter((g) => g.words.every((w) => all.has(w)));
console.log(
  `${base.length} grades-base lidas (${before - base.length} descartadas)`,
);

// 2) Para cada tema, tenta trocar respostas por palavras do tema.
function themify(grid, themeWords) {
  const { mold } = grid;
  const letters = [...grid.letters];
  const words = [...grid.words];
  const slots = mold.slots;
  const cellSlots = {};
  slots.forEach((sl, i) =>
    sl.cells.forEach((k) => (cellSlots[k] ??= []).push(i)),
  );
  const used = new Set(words);
  const shuffled = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const fits = (sl, w, skip = -1) =>
    sl.cells.every(
      (k, j) =>
        letters[k] === w[j] ||
        (cellSlots[k].length === 1 && skip < 0) ||
        cellSlots[k].every((o) => o === skip || slots[o] === sl),
    );
  const themeByLen = {};
  for (const w of themeWords) (themeByLen[w.length] ??= []).push(w);
  for (const i of shuffled(slots.map((_, k) => k))) {
    if (themeWords.has(words[i])) continue;
    const sl = slots[i];
    for (const w of shuffled(themeByLen[sl.len] ?? []).slice(0, 80)) {
      if (used.has(w)) continue;
      // Cada cruzamento que muda de letra exige reescrever a resposta que o cruza (profundidade 1).
      const repairs = [];
      const taken = new Set([w]);
      let ok = true;
      for (let j = 0; j < sl.len && ok; j++) {
        const k = sl.cells[j];
        if (letters[k] === w[j]) continue;
        const other = cellSlots[k].find((o) => o !== i);
        if (other === undefined) continue;
        const os = slots[other];
        const pos = os.cells.indexOf(k);
        const options = (byLen[os.len] ?? []).filter(
          (c) =>
            !used.has(c) &&
            !taken.has(c) &&
            c[pos] === w[j] &&
            os.cells.every(
              (kk, m) =>
                kk === k || cellSlots[kk].length === 1 || c[m] === letters[kk],
            ),
        );
        if (!options.length) ok = false;
        else {
          const themed = options.filter((c) => themeWords.has(c));
          const pool = themed.length ? themed : options;
          const chosen = pool[Math.floor(rand() * pool.length)];
          taken.add(chosen);
          repairs.push([other, chosen]);
        }
      }
      if (!ok) continue;
      used.delete(words[i]);
      used.add(w);
      words[i] = w;
      sl.cells.forEach((k, j) => (letters[k] = w[j]));
      for (const [o, c] of repairs) {
        used.delete(words[o]);
        used.add(c);
        words[o] = c;
        slots[o].cells.forEach((k, m) => (letters[k] = c[m]));
      }
      break;
    }
  }
  if (new Set(words).size !== words.length)
    return { words: [...grid.words], count: 0 };
  return { words, count: words.filter((w) => themeWords.has(w)).length };
}
const result = fs.existsSync(out)
  ? JSON.parse(fs.readFileSync(out, "utf8"))
  : { themes: [] };
for (const id of wanted) {
  const theme = themes[id];
  // O tipo de cada palavra vem do catálogo (scripts/data/catalogo.json).
  const themeWords = new Set(
    [...all.values()].filter((e) => e.tipo === id).map((e) => e.word),
  );
  const ranked = base
    .map((g) => {
      // A ordem das trocas muda o resultado: tenta várias e fica com a melhor.
      let best = themify(g, themeWords);
      for (let r = 1; r < tries; r++) {
        const t = themify(g, themeWords);
        if (t.count > best.count) best = t;
      }
      return { g, ...best };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
  console.log(
    `${theme.nome}: ${themeWords.size} palavras do tema; melhores grades com`,
    ranked.map((r) => r.count).join(", "),
    "palavras do tema",
  );
  if (ranked.at(-1).count < minTheme) {
    console.error(
      `  poucas palavras do tema (mínimo ${minTheme}); aumente --pool`,
    );
    process.exit(1);
  }
  const puzzles = ranked.map(({ g, words }, i) => ({
    id: `casual-${id}-${i + 1}`,
    number: i + 1,
    world: id,
    difficulty: "casual",
    rows: ROWS,
    cols: COLS,
    words: g.mold.slots.map((s, k) => ({
      id: words[k].toLowerCase(),
      clue: all.get(words[k]).clue,
      answer: words[k],
      direction: s.dir === "h" ? "horizontal" : "vertical",
      startRow: s.row,
      startCol: s.col,
      clueRow: s.clueRow,
      clueCol: s.clueCol,
      arrow: s.dir === "h" ? "right" : "down",
    })),
  }));
  const entry = { id, nome: theme.nome, puzzles };
  const at = result.themes.findIndex((t) => t.id === id);
  if (at < 0) result.themes.push(entry);
  else result.themes[at] = entry;
}
if (!args.dry) fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(args.dry ? "teste, nada gravado" : `gravado em ${out}`);
