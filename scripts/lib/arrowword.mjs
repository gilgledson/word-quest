// Gerador de cruzadinhas densas (arrowword) 8×10: moldes de pistas + solver por backtracking.
// Fora do app React: roda em Node e só publica tabuleiros completos e válidos.
export const ROWS = 10;
export const COLS = 8;
export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const idx = (r, c) => r * COLS + c;

/**
 * Células: "L" letra, "C" pista, "X" bloco. Borda superior e esquerda são pistas
 * (a casa (0,0) é bloco, como na referência). Pista sem uso vira bloco.
 */
export function analyze(
  grid,
  { maxH = 7, maxV = 9, maxBlocks = 4, maxLong = 2 } = {},
) {
  const at = (r, c) => grid[idx(r, c)];
  const slots = [];
  const errors = [];
  const covered = new Set();
  const runs = (dir) => {
    const outer = dir === "h" ? ROWS : COLS;
    const inner = dir === "h" ? COLS : ROWS;
    for (let a = 0; a < outer; a++) {
      let b = 0;
      while (b < inner) {
        const cell = (x) => (dir === "h" ? at(a, x) : at(x, a));
        if (cell(b) !== "L") {
          b++;
          continue;
        }
        const start = b;
        while (b < inner && cell(b) === "L") b++;
        const len = b - start;
        if (len < 2) continue;
        const row = dir === "h" ? a : start;
        const col = dir === "h" ? start : a;
        const clueRow = dir === "h" ? a : start - 1;
        const clueCol = dir === "h" ? start - 1 : a;
        if (start === 0 || at(clueRow, clueCol) !== "C")
          errors.push("sem pista");
        if (len > (dir === "h" ? maxH : maxV)) errors.push("longa");
        const cells = Array.from({ length: len }, (_, i) =>
          dir === "h" ? idx(row, col + i) : idx(row + i, col),
        );
        cells.forEach((k) => covered.add(k));
        slots.push({ dir, row, col, len, clueRow, clueCol, cells });
      }
    }
  };
  runs("h");
  runs("v");
  // No máximo `maxLong` palavras de 8 letras ou mais (o vocabulário longo é pequeno).
  if (slots.filter((sl) => sl.len >= 8).length > maxLong) errors.push("longa");
  const isolated = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (at(r, c) === "L" && !covered.has(idx(r, c))) isolated.push(idx(r, c));
  if (isolated.length) errors.push("isolada");
  // Pistas sem palavra viram blocos.
  const out = [...grid];
  const used = new Set(slots.map((s) => idx(s.clueRow, s.clueCol)));
  let blocks = 0;
  for (let k = 0; k < out.length; k++) {
    if (out[k] === "C" && !used.has(k)) out[k] = "X";
    if (out[k] === "X") blocks++;
  }
  if (blocks > maxBlocks + 1) errors.push("blocos");
  return { errors, slots, isolated, grid: out };
}

export function makeMold(rand, opts = {}) {
  const {
    minSlots = 20,
    maxSlots = 32,
    maxTwo = 5,
    maxThree = 99,
    minAvg = 3.4,
  } = opts;
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array(ROWS * COLS).fill("L");
    grid[0] = "X";
    for (let c = 1; c < COLS; c++) grid[idx(0, c)] = "C";
    for (let r = 1; r < ROWS; r++) grid[idx(r, 0)] = "C";
    const p = 0.14 + rand() * 0.12;
    for (let r = 1; r < ROWS; r++)
      for (let c = 1; c < COLS; c++) if (rand() < p) grid[idx(r, c)] = "C";
    for (let iter = 0; iter < 60; iter++) {
      const res = analyze(grid, opts);
      if (!res.errors.length) {
        const avg =
          res.slots.reduce((n, sl) => n + sl.len, 0) / res.slots.length;
        const twos = res.slots.filter((sl) => sl.len === 2).length;
        if (
          res.slots.length >= minSlots &&
          res.slots.length <= maxSlots &&
          twos <= maxTwo &&
          res.slots.filter((sl) => sl.len === 3).length <= maxThree &&
          avg >= minAvg
        )
          return res;
        break;
      }
      const fix = res.errors[0];
      if (fix === "isolada") {
        const k = res.isolated[Math.floor(rand() * res.isolated.length)];
        grid[k] = "C";
      } else if (fix === "longa") {
        const limit = (sl) =>
          sl.dir === "h" ? (opts.maxH ?? 7) : (opts.maxV ?? 9);
        const long = res.slots.filter(
          (sl) => sl.len > limit(sl) || sl.len >= 8,
        );
        const s = long[Math.floor(rand() * long.length)];
        const pos = 1 + Math.floor(rand() * (s.len - 2));
        grid[s.cells[pos]] = "C";
      } else break;
    }
  }
  return null;
}

// Índice por (comprimento, posição, letra) em bitsets: achar as palavras que cabem num espaço é um
// AND de poucas máscaras, em vez de varrer o vocabulário inteiro a cada nó da busca.
const indexCache = new WeakMap();
function indexFor(wordsByLen) {
  let ix = indexCache.get(wordsByLen);
  if (ix) return ix;
  ix = {};
  for (const [len, list] of Object.entries(wordsByLen)) {
    const L = Number(len);
    const words = list.filter((w) => /^[A-Z]+$/.test(w));
    const W = (words.length + 31) >>> 5;
    const masks = Array.from({ length: L }, () =>
      Array.from({ length: 26 }, () => new Uint32Array(W)),
    );
    const all = new Uint32Array(W);
    words.forEach((w, j) => {
      all[j >>> 5] |= 1 << (j & 31);
      for (let i = 0; i < L; i++)
        masks[i][w.charCodeAt(i) - 65][j >>> 5] |= 1 << (j & 31);
    });
    ix[L] = { words, W, masks, all };
  }
  indexCache.set(wordsByLen, ix);
  return ix;
}
const popcount = (v) => {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

/** Preenche todas as casas de resposta com palavras do vocabulário (cada palavra uma vez). */
export function solve(
  mold,
  wordsByLen,
  rand,
  {
    maxNodes = 4000,
    width = 6,
    prefer,
    onStep,
    themeSlots,
    themeSet,
    fixed,
  } = {},
) {
  const { slots } = mold;
  const ix = indexFor(wordsByLen);
  const letters = new Array(ROWS * COLS).fill("");
  const assigned = new Array(slots.length).fill(null);
  const usedMask = {};
  let maxW = 1;
  for (const [L, e] of Object.entries(ix)) {
    usedMask[L] = new Uint32Array(e.W);
    maxW = Math.max(maxW, e.W);
  }
  const tmp = new Uint32Array(maxW);
  const bestBuf = new Uint32Array(maxW);
  let nodes = 0;
  /** Palavras livres que cabem no espaço; devolve a contagem e deixa a máscara em `out`. */
  const themeMasks = {};
  const themeMask = (len) => {
    if (!themeMasks[len]) {
      const e = ix[len];
      const m = new Uint32Array(e.W);
      e.words.forEach((w, j) => {
        if (themeSet.has(w)) m[j >>> 5] |= 1 << (j & 31);
      });
      themeMasks[len] = m;
    }
    return themeMasks[len];
  };
  const fill = (slot, out, restrict = false) => {
    const e = ix[slot.len];
    if (!e) return 0;
    const um = usedMask[slot.len];
    const fixed = [];
    for (let i = 0; i < slot.len; i++) {
      const ch = letters[slot.cells[i]];
      if (ch) fixed.push(e.masks[i][ch.charCodeAt(0) - 65]);
    }
    let count = 0;
    const tm = restrict ? themeMask(slot.len) : null;
    for (let w = 0; w < e.W; w++) {
      let v = e.all[w] & ~um[w];
      if (tm) v &= tm[w];
      for (let f = 0; f < fixed.length && v; f++) v &= fixed[f][w];
      out[w] = v;
      count += popcount(v);
    }
    return count;
  };
  // Respostas já decididas (slot -> palavra): entram antes da busca; conflito de letras = sem solução.
  if (fixed) {
    for (const [i, w] of fixed) {
      const slot = slots[i];
      const e = ix[slot.len];
      const j = e?.words.indexOf(w) ?? -1;
      if (j < 0 || w.length !== slot.len) return { nodes, failed: true };
      for (let c = 0; c < slot.len; c++) {
        const k = slot.cells[c];
        if (letters[k] && letters[k] !== w[c]) return { nodes, failed: true };
        letters[k] = w[c];
      }
      if (usedMask[slot.len][j >>> 5] & (1 << (j & 31)))
        return { nodes, failed: true };
      usedMask[slot.len][j >>> 5] |= 1 << (j & 31);
      assigned[i] = w;
    }
  }
  const search = () => {
    if (++nodes > maxNodes) return false;
    let best = -1;
    let bestCount = Infinity;
    for (let i = 0; i < slots.length; i++) {
      if (assigned[i]) continue;
      const count = fill(slots[i], tmp, themeSlots?.has(i));
      if (!count) return false;
      if (count < bestCount) {
        best = i;
        bestCount = count;
        bestBuf.set(tmp);
        if (count === 1) break;
      }
    }
    if (best < 0) return true;
    const slot = slots[best];
    const e = ix[slot.len];
    const list = [];
    for (let w = 0; w < e.W; w++) {
      let v = bestBuf[w];
      while (v) {
        const bit = 31 - Math.clz32(v & -v);
        list.push([w * 32 + bit, e.words[w * 32 + bit]]);
        v &= v - 1;
      }
    }
    const ranked = list
      .map((x) => [rand() - (prefer ? prefer(x[1]) : 0), x])
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1]);
    // Metade das tentativas segue a preferência (palavras mais difíceis/longas); o resto é sorteado.
    const rest = ranked.slice(width);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const order = [...ranked.slice(0, width), ...rest.slice(0, width)];
    const um = usedMask[slot.len];
    for (const [j, w] of order) {
      const saved = slot.cells.map((k) => letters[k]);
      slot.cells.forEach((k, i) => (letters[k] = w[i]));
      assigned[best] = w;
      um[j >>> 5] |= 1 << (j & 31);
      onStep?.(letters, nodes);
      if (search()) return true;
      um[j >>> 5] &= ~(1 << (j & 31));
      assigned[best] = null;
      slot.cells.forEach((k, i) => (letters[k] = saved[i]));
      if (nodes > maxNodes) return false;
    }
    return false;
  };
  const ok = search();
  return ok ? { words: assigned, letters, nodes } : { nodes, failed: true };
}
