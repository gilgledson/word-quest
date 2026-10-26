// Uso: node scripts/generate-levels.mjs [--only 2,3] [--seed 1] [--molds 4000] [--nodes 3000] [--pool 10]
//        [--out src/data/levels.json] [--dry] [--report] [--reuse] [--gap 4 --max-uses 4]
// Só usa palavras com pista revisada (scripts/data/clues*.txt, formato PALAVRA|Pista|nível) que existam
// no dicionário. Publica apenas grades completas e válidas. Com --only regenera só essas fases e
// preserva as demais (as palavras delas ficam fora do sorteio, para não repetir entre fases).
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
const seed = Number(args.seed ?? 1);
const molds = Number(args.molds ?? 4000);
const maxNodes = Number(args.nodes ?? 3000);
const pool = Number(args.pool ?? 10);
const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
);
const out = args.out ?? path.join(here, "..", "src", "data", "levels.json");

// Dificuldade da fase = vocabulário e pistas (nível das palavras) e estrutura da grade; nunca o tamanho.
const PROFILE = {
  1: { tier: 1, minHard: 0, mold: { maxTwo: 5, minAvg: 3.4 }, label: "fácil" },
  2: {
    tier: 2,
    minHard: 6,
    mold: { maxTwo: 4, minAvg: 3.5, maxLong: 1 },
    label: "médio",
  },
  3: {
    tier: 3,
    minHard: 4,
    minMid: 12,
    mold: { maxTwo: 4, minAvg: 3.5, maxLong: 1 },
    label: "difícil",
  },
};
// Cinco fases por mundo, na ordem do mapa.
const WORLD_IDS = ["vila", "floresta", "deserto", "reino", "ilhas"];
const worldOf = (n) => WORLD_IDS[Math.min(4, Math.floor((n - 1) / 5))];
const OBSCURE = new Set("URU GNU IPE OSA OVA FEL AVO UAI HUM EGO".split(" "));
const { valid } = validateClues();
const all = new Map(
  valid.filter((e) => !OBSCURE.has(e.word)).map((e) => [e.word, e]),
);
console.log(
  `${all.size} palavras com pista`,
  Object.fromEntries(
    [1, 2, 3].map((t) => [
      `nível ${t}`,
      [...all.values()].filter((e) => e.tier === t).length,
    ]),
  ),
);

const levels = JSON.parse(fs.readFileSync(out, "utf8"));
const only = args.only
  ? String(args.only).split(",").map(Number)
  : levels.map((l) => l.number);
const used = new Set();
const uses = new Map();
// Regra de repetição (--gap G --max-uses M): uma palavra pode aparecer em até M fases, e duas fases
// com a mesma palavra ficam pelo menos G fases distantes (G = 4: a da fase 1 só volta na 5).
const GAP = args.gap !== undefined ? Number(args.gap) : null;
const MAX_USES = Number(args["max-uses"] ?? 4);
const usage = new Map(); // palavra -> números das fases que a usam
const addUsage = (w, n) => usage.set(w, [...(usage.get(w) ?? []), n]);
const allowed = (w, n) => {
  const at = usage.get(w);
  if (!at) return true;
  return at.length < MAX_USES && at.every((m) => Math.abs(m - n) >= GAP);
};
for (const l of levels)
  if (!only.includes(l.number))
    for (const w of l.words) {
      used.add(w.answer.toUpperCase());
      addUsage(w.answer.toUpperCase(), l.number);
    }

const stats = { molds: 0 };
// --live: grava o andamento em public/live/progress.json (lido por public/live/index.html).
const live = args.live
  ? path.join(here, "..", "public", "live", "progress.json")
  : null;
let lastWrite = 0;
const done =
  live && args.keep && fs.existsSync(live)
    ? JSON.parse(fs.readFileSync(live, "utf8")).done
    : [];
const publish = (state, force = false) => {
  if (!live) return;
  const now = Date.now();
  if (!force && now - lastWrite < 120) return;
  lastWrite = now;
  fs.mkdirSync(path.dirname(live), { recursive: true });
  try {
    fs.writeFileSync(live, JSON.stringify({ ...state, done }));
  } catch {
    /* O navegador pode estar lendo o arquivo; a próxima escrita corrige. */
  }
};
for (const n of only) {
  const base = PROFILE[args.profile ?? 1];
  // --two/--three/--minavg/--slots limitam as palavras curtas: sem repetir palavra entre as 25 fases,
  // o catálogo de 2 e 3 letras (pequeno) precisa render.
  const profile = {
    ...base,
    ...(args.tier !== undefined && {
      tier: Number(args.tier),
      minHard: 0,
      minMid: 0,
    }),
    mold: {
      ...base.mold,
      ...(args.two !== undefined && { maxTwo: Number(args.two) }),
      ...(args.three !== undefined && { maxThree: Number(args.three) }),
      ...(args.minavg !== undefined && { minAvg: Number(args.minavg) }),
      ...(args.maxslots !== undefined && { maxSlots: Number(args.maxslots) }),
    },
  };
  const rand = rng(seed * 1000 + n);
  const entries = [...all.values()].filter(
    (e) =>
      e.tier <= profile.tier &&
      (GAP !== null
        ? allowed(e.word, n)
        : args.reuse ||
          !used.has(e.word) ||
          (args.reuseShort && e.word.length <= 3)),
  );
  const byLen = {};
  for (const e of entries) (byLen[e.word.length] ??= []).push(e.word);
  const tierOf = (w) => all.get(w).tier;
  // Quanto maior, antes entra no sorteio da busca: palavras longas e de nível maior primeiro; as já
  // usadas (só curtas, com --reuse-short) por último, as menos repetidas antes.
  const prefer = (w) =>
    (tierOf(w) - 1) * (args.easyFirst ? -1.5 : 0.35) +
    Math.max(0, w.length - 4) * 0.12 -
    (used.has(w) ? 0.8 : 0) -
    (usage.get(w)?.length ?? uses.get(w) ?? 0) * Number(args.penalty ?? 0.3);
  // Pelo menos uma casa de pista dupla (duas palavras saindo da mesma casa, em setas diferentes).
  const hasDouble = (mold) => {
    const seen = new Map();
    for (const sl of mold.slots) {
      const k = `${sl.clueRow},${sl.clueCol}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.values()].some((c) => c === 2);
  };
  const accept = (res, mold) => {
    if (!hasDouble(mold)) return false;
    const hard = res.words.filter((w) => tierOf(w) === profile.tier).length;
    const mid = res.words.filter((w) => tierOf(w) >= 2).length;
    return (
      (profile.tier === 1 || hard >= profile.minHard) &&
      mid >= (profile.minMid ?? 0)
    );
  };
  const score = ({ mold, res }) =>
    mold.slots.reduce((sum, sl) => sum + sl.len * sl.len, 0) -
    6 * mold.slots.filter((sl) => sl.len === 2).length -
    3 * mold.slots.filter((sl) => sl.len === 3).length +
    4 * res.words.reduce((sum, w) => sum + tierOf(w) - 1, 0);
  const candidates = [];
  const budget = stats.molds + molds;
  while (candidates.length < pool && stats.molds < budget) {
    stats.molds++;
    const mold = makeMold(rand, profile.mold);
    if (!mold) continue;
    const cells = (letters) =>
      Array.from({ length: ROWS * COLS }, (_, k) =>
        mold.grid[k] === "L"
          ? (letters?.[k] ?? "")
          : mold.grid[k] === "C"
            ? "#"
            : "·",
      );
    const base = {
      level: n,
      mold: stats.molds,
      molds: molds,
      slots: mold.slots.length,
    };
    publish({ ...base, status: "novo molde", cells: cells(), nodes: 0 }, true);
    const res = solve(mold, byLen, rand, {
      maxNodes,
      width: Number(args.width ?? 6),
      prefer,
      onStep: (letters, nodes) =>
        publish({
          ...base,
          status: "preenchendo",
          cells: cells(letters),
          nodes,
        }),
    });
    if (!res.failed)
      publish(
        {
          ...base,
          status: "grade completa",
          cells: cells(res.letters),
          nodes: res.nodes,
        },
        true,
      );
    if (!res.failed) stats.solved = (stats.solved ?? 0) + 1;
    if (!res.failed && accept(res, mold)) candidates.push({ mold, res });
  }
  if (!candidates.length) {
    console.error(
      `FALHOU fase ${n} após ${stats.molds} moldes (${stats.solved ?? 0} grades resolvidas)`,
    );
    process.exit(1);
  }
  const { mold, res } = candidates.sort((a, b) => score(b) - score(a))[0];
  done.push({
    level: n,
    cells: Array.from({ length: ROWS * COLS }, (_, k) =>
      mold.grid[k] === "L" ? res.letters[k] : mold.grid[k] === "C" ? "#" : "·",
    ),
  });
  publish(
    {
      level: n,
      status: "fase concluída",
      cells: done.at(-1).cells,
      nodes: 0,
      mold: stats.molds,
      molds,
      slots: mold.slots.length,
    },
    true,
  );
  for (const w of res.words) {
    used.add(w);
    uses.set(w, (uses.get(w) ?? 0) + 1);
    addUsage(w, n);
  }
  const old = levels.find((l) => l.number === n);
  const level = {
    id: old?.id ?? `${worldOf(n)}-${n}`,
    number: n,
    world: old?.world ?? worldOf(n),
    difficulty: old?.difficulty ?? profile.label,
    rows: ROWS,
    cols: COLS,
    words: mold.slots.map((s, i) => ({
      id: res.words[i].toLowerCase(),
      clue: all.get(res.words[i]).clue,
      answer: res.words[i],
      direction: s.dir === "h" ? "horizontal" : "vertical",
      startRow: s.row,
      startCol: s.col,
      clueRow: s.clueRow,
      clueCol: s.clueCol,
      arrow: s.dir === "h" ? "right" : "down",
    })),
  };
  const at = levels.findIndex((l) => l.number === n);
  if (at < 0) levels.push(level);
  else levels[at] = level;
  // Grava a cada fase: uma falha adiante não perde o que já saiu (retome com --only das restantes).
  if (!args.dry) {
    levels.sort((a, b) => a.number - b.number);
    fs.writeFileSync(out, JSON.stringify(levels, null, 2) + "\n");
  }
  const lens = mold.slots.map((s) => s.len);
  console.log(
    `fase ${n} (${profile.label}): ${mold.slots.length} palavras, ` +
      `${lens.filter((l) => l <= 3).length} de até 3 letras, ` +
      `${res.words.filter((w) => tierOf(w) === 2).length} médias, ` +
      `${res.words.filter((w) => tierOf(w) === 3).length} difíceis, moldes ${stats.molds}`,
  );
  console.log(
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const k = r * COLS + c;
        return mold.grid[k] === "L"
          ? res.letters[k]
          : mold.grid[k] === "C"
            ? "#"
            : "·";
      }).join(" "),
    ).join("\n"),
  );
  if (args.report) {
    const count = {};
    for (const sl of mold.slots)
      for (const k of sl.cells) count[k] = (count[k] ?? 0) + 1;
    mold.slots.forEach((sl, i) => {
      const pattern = sl.cells.map((k, j) =>
        count[k] > 1 ? res.words[i][j] : ".",
      );
      const re = new RegExp(`^${pattern.join("")}$`);
      const alts = [...all.keys()].filter(
        (w) => w.length === sl.len && w !== res.words[i] && re.test(w),
      );
      console.log(
        `  ${sl.dir}${i} ${res.words[i]} «${all.get(res.words[i]).clue}»` +
          (alts.length
            ? `  ALT: ${alts.map((w) => `${w} «${all.get(w).clue}»`).join(" · ")}`
            : ""),
      );
    });
  }
}
if (args.dry) process.exit(0);
levels.sort((a, b) => a.number - b.number);
fs.writeFileSync(out, JSON.stringify(levels, null, 2) + "\n");
console.log(`gravado em ${out}`);
