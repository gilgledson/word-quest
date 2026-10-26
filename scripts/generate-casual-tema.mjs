// Gera as grades do modo casual com 100% de palavras do tema (tipo) escolhido.
// Uso: node scripts/generate-casual-tema.mjs [--themes animais,comida] [--count 6] [--tries 400]
//        [--min-words 14] [--seed 1] [--out src/data/casual.json] [--dry]
//
// Em vez de preencher uma grade densa com vocabulário geral (o que obriga a usar palavras de fora do
// tema), monta a grade colocando só palavras do tema, uma a uma, sempre cruzando letras já postas: cada
// palavra tem a casa de pista logo antes (à esquerda ou acima) e nenhuma sequência de letras pode formar
// palavra que não esteja na lista. As casas que sobram viram blocos. Por isso a grade do casual é mais
// aberta que a das fases (ver `casualLayoutErrors` em src/game/crossword-engine.ts).
import fs from "node:fs";
import path from "node:path";
import { ROWS, COLS, rng } from "./lib/arrowword.mjs";
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
const tries = Number(args.tries ?? 400);
const minWords = Number(args["min-words"] ?? 14);
const seed = Number(args.seed ?? 1);
const themes = JSON.parse(
  fs.readFileSync(path.join(here, "data", "themes.json"), "utf8"),
);
const wanted = args.themes
  ? String(args.themes).split(",")
  : Object.keys(themes);
const { valid } = validateClues();
const rand = rng(seed * 6151);
let themeSet = null; // palavras do tema atual (para as que surgem por acaso)
const pick = (list) => list[Math.floor(rand() * list.length)];
const shuffled = (list) => {
  const o = [...list];
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};
const at = (r, c) => r * COLS + c;
const inside = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;

/** Estado: letras por casa, casas de pista (com as setas usadas) e as palavras postas. */
const fresh = () => ({
  letters: Array(ROWS * COLS).fill(""),
  clues: new Map(), // casa -> Set("right" | "down")
  slots: [],
});

/** Tenta pôr `word` começando em (r, c); devolve o novo estado ou null se alguma regra falhar. */
function place(state, word, r, c, dir) {
  const dr = dir === "v" ? 1 : 0;
  const dc = dir === "h" ? 1 : 0;
  const cr = r - dr;
  const cc = c - dc;
  if (!inside(cr, cc) || state.letters[at(cr, cc)]) return null;
  const arrow = dir === "h" ? "right" : "down";
  if (state.clues.get(at(cr, cc))?.has(arrow)) return null;
  const endR = r + dr * word.length;
  const endC = c + dc * word.length;
  if (endR > ROWS || endC > COLS) return null;
  if (inside(endR, endC) && state.letters[at(endR, endC)]) return null;
  let crossings = 0;
  const letters = [...state.letters];
  for (let i = 0; i < word.length; i++) {
    const k = at(r + dr * i, c + dc * i);
    if (state.clues.has(k)) return null; // letra sobre casa de pista
    if (letters[k] && letters[k] !== word[i]) return null;
    if (letters[k]) crossings++;
    letters[k] = word[i];
  }
  const clues = new Map(state.clues);
  const shared = clues.has(at(cr, cc));
  clues.set(at(cr, cc), new Set([...(clues.get(at(cr, cc)) ?? []), arrow]));
  const next = {
    letters,
    clues,
    slots: [...state.slots, { word, r, c, dir, cr, cc, arrow }],
  };
  // Toda sequência de 2+ letras, nas duas direções, é uma palavra: a posta ou uma palavra do tema que
  // surgiu do encontro de letras (ganha a própria casa de pista, antes dela). Cada resposta aparece uma vez.
  const keyOf = (d, r0, c0, len) => `${d}:${r0},${c0},${len}`;
  const runKeys = new Set();
  const words = new Set(next.slots.map((x) => x.word));
  const known = new Set(
    next.slots.map((x) => keyOf(x.dir, x.r, x.c, x.word.length)),
  );
  for (const d of ["h", "v"]) {
    const outer = d === "h" ? ROWS : COLS;
    const inner = d === "h" ? COLS : ROWS;
    for (let a = 0; a < outer; a++) {
      let b = 0;
      while (b < inner) {
        const cell = (x) => letters[d === "h" ? at(a, x) : at(x, a)];
        if (!cell(b)) {
          b++;
          continue;
        }
        const start = b;
        while (b < inner && cell(b)) b++;
        const len = b - start;
        if (len < 2) continue;
        const r0 = d === "h" ? a : start;
        const c0 = d === "h" ? start : a;
        const key = keyOf(d, r0, c0, len);
        runKeys.add(key);
        if (known.has(key)) continue;
        // Palavra que surgiu por acaso: tem de ser do tema, nova e com casa de pista livre antes dela.
        if (!themeSet) return null;
        let text = "";
        for (let x = start; x < b; x++) text += cell(x);
        if (!themeSet.has(text) || words.has(text)) return null;
        const ar = d === "h" ? "right" : "down";
        const icr = d === "h" ? r0 : r0 - 1;
        const icc = d === "h" ? c0 - 1 : c0;
        if (!inside(icr, icc) || letters[at(icr, icc)]) return null;
        if (clues.get(at(icr, icc))?.has(ar)) return null;
        clues.set(
          at(icr, icc),
          new Set([...(clues.get(at(icr, icc)) ?? []), ar]),
        );
        next.slots.push({
          word: text,
          r: r0,
          c: c0,
          dir: d,
          cr: icr,
          cc: icc,
          arrow: ar,
        });
        words.add(text);
      }
    }
  }
  // Nenhuma palavra posta pode ter crescido (uma letra nova colada no fim dela).
  for (const x of next.slots)
    if (!runKeys.has(keyOf(x.dir, x.r, x.c, x.word.length))) return null;
  // Casas de pista nunca são letra.
  for (const k of clues.keys()) if (letters[k]) return null;
  return { state: next, crossings, shared };
}

/** Jogadas possíveis a partir de um estado: cruzando letras postas e em posições livres. */
function moves(state, words, used, avoid) {
  const options = [];
  const sample = shuffled(words).slice(0, 110);
  for (const w of sample) {
    if (used.has(w)) continue;
    for (let i = 0; i < w.length; i++)
      for (let k = 0; k < ROWS * COLS; k++) {
        if (state.letters[k] !== w[i]) continue;
        const r = Math.floor(k / COLS);
        const c = k % COLS;
        for (const dir of ["h", "v"]) {
          const r0 = dir === "v" ? r - i : r;
          const c0 = dir === "h" ? c - i : c;
          const res = place(state, w, r0, c0, dir);
          if (res) options.push({ w, res });
        }
      }
  }
  // Posições livres (sem cruzar): enchem os cantos que sobraram.
  for (const w of sample.slice(0, 40)) {
    if (used.has(w)) continue;
    for (let n = 0; n < 14; n++) {
      const dir = rand() < 0.5 ? "h" : "v";
      const res = place(
        state,
        w,
        Math.floor(rand() * ROWS),
        Math.floor(rand() * COLS),
        dir,
      );
      if (res) options.push({ w, res });
    }
  }
  for (const o of options)
    o.score =
      o.res.crossings * 2 +
      (o.res.shared ? 3 : 0) -
      o.w.length * Number(args.shortw ?? 0.4) -
      (avoid.get(o.w) ?? 0) * 1.5 +
      rand() * 2;
  return options.sort((a, b) => b.score - a.score);
}

const beamWidth = Number(args.beam ?? 8);
const branch = Number(args.branch ?? 5);
const value = (s) => s.slots.length * 10 + s.letters.filter(Boolean).length;

/** Uma grade por busca em feixe: guarda os melhores estados parciais a cada palavra posta. */
function build(words, avoid) {
  let beam = [];
  for (let n = 0; n < beamWidth * 3 && beam.length < beamWidth; n++) {
    const first = pick(words.filter((w) => w.length >= 4));
    const dir = rand() < 0.5 ? "h" : "v";
    const r = 1 + Math.floor(rand() * (ROWS - 2));
    const c = 1 + Math.floor(rand() * (COLS - 2));
    const res = place(fresh(), first, r, c, dir);
    if (res) beam.push(res.state);
  }
  let best = null;
  for (let step = 0; step < 30 && beam.length; step++) {
    const next = [];
    const seenKeys = new Set();
    for (const state of beam) {
      const used = new Set(state.slots.map((x) => x.word));
      for (const o of moves(state, words, used, avoid).slice(0, branch)) {
        const key = o.res.state.slots
          .map((x) => `${x.word}@${x.r},${x.c},${x.dir}`)
          .sort()
          .join("|");
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        next.push(o.res.state);
      }
    }
    if (!next.length) break;
    next.sort((a, b) => value(b) - value(a));
    beam = next.slice(0, beamWidth);
    if (!best || value(beam[0]) > value(best)) best = beam[0];
  }
  return best;
}

const result = fs.existsSync(out)
  ? JSON.parse(fs.readFileSync(out, "utf8"))
  : { themes: [] };
for (const id of wanted) {
  const theme = themes[id];
  const entries = valid.filter((e) => e.tipo === id && e.tier === 1);
  const clueOf = new Map(entries.map((e) => [e.word, e.clue]));
  const words = entries.map((e) => e.word).filter((w) => w.length >= 3);
  themeSet = new Set(entries.map((e) => e.word));
  const avoid = new Map();
  const grids = [];
  const seen = new Set();
  const hist = {};
  const t0 = Date.now();
  for (let t = 0; t < tries * count && grids.length < count * 12; t++) {
    const s = build(words, avoid);
    if (!s) continue;
    hist[s.slots.length] = (hist[s.slots.length] ?? 0) + 1;
    if (s.slots.length < minWords) continue;
    const key = s.slots
      .map((x) => x.word)
      .sort()
      .join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    grids.push(s);
  }
  if (args.hist) console.log(hist);
  const letterCount = (s) => s.letters.filter(Boolean).length;
  // Fica com as mais cheias, preferindo grades que repetem pouco as palavras já escolhidas.
  const chosen = [];
  for (const s of [...grids].sort((a, b) => letterCount(b) - letterCount(a))) {
    if (chosen.length >= count) break;
    const overlap = s.slots.filter((x) => (avoid.get(x.word) ?? 0) >= 2).length;
    if (overlap > s.slots.length * 0.3) continue;
    chosen.push(s);
    for (const x of s.slots) avoid.set(x.word, (avoid.get(x.word) ?? 0) + 1);
  }
  console.log(
    `${theme.nome}: ${words.length} palavras; ${grids.length} grades geradas, ficam ` +
      chosen
        .map((s) => `${s.slots.length} palavras/${letterCount(s)} letras`)
        .join(", ") +
      ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
  );
  if (chosen.length < count) {
    console.error(`  só ${chosen.length} grades; aumente --tries`);
    continue;
  }
  const puzzles = chosen.map((s, i) => ({
    id: `casual-${id}-${i + 1}`,
    number: i + 1,
    world: id,
    difficulty: "casual",
    rows: ROWS,
    cols: COLS,
    words: s.slots.map((x) => ({
      id: x.word.toLowerCase(),
      clue: clueOf.get(x.word),
      answer: x.word,
      direction: x.dir === "h" ? "horizontal" : "vertical",
      startRow: x.r,
      startCol: x.c,
      clueRow: x.cr,
      clueCol: x.cc,
      arrow: x.arrow,
    })),
  }));
  const entry = { id, nome: theme.nome, puzzles };
  const pos = result.themes.findIndex((t) => t.id === id);
  if (pos < 0) result.themes.push(entry);
  else result.themes[pos] = entry;
}
if (!args.dry) fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(args.dry ? "teste, nada gravado" : `gravado em ${out}`);
