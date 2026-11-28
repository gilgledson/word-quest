// Deriva a lista de palavras (sem acentos, 2–9 letras) a partir de um dicionário Hunspell, expandindo
// os afixos do .aff (o .dic só traz lemas; "casa", "mesa" etc. vêm das regras).
// Português: VERO (pt_BR). Espanhol (`--lang es`): RLA-ES (es_MX), com o Ñ mantido como letra.
// Uso: node scripts/build-dictionary.mjs [--lang es] <dic> <aff> [saida]
// O dicionário bruto e a lista expandida NÃO entram no repositório (ver scripts/README.md).
import fs from "node:fs";
import path from "node:path";
import { LANG, scriptData, strip } from "./lib/lang.mjs";

const args = process.argv
  .slice(2)
  .filter((a, i, all) => a !== "--lang" && all[i - 1] !== "--lang");
const [dicPath, affPath, output = path.join(scriptData, "dictionary.txt")] =
  args;
if (!dicPath || !affPath) {
  console.error(
    "Uso: node scripts/build-dictionary.mjs [--lang es] <dic> <aff> [saida]",
  );
  process.exit(1);
}
const BLOCKED_BY_LANG = {
  pt: "porra caralho puta puto merda foder fodido buceta cu cuzao viado bicha boceta pinto piroca punheta cacete bosta xoxota rola estupro nazismo",
  es: "puta puto putas putos putita mierda joder jodido jodida coño cojones cojon verga vergas pinche pendejo pendeja pendejos culero culera culo culos chingar chingada chingado chinga mamon mamona marica maricon maricona maricones polla pollas zorra zorras cabron cabrona cabrones carajo concha conchas pija pijas pajero pajera paja ojete orto choto chota boludo boluda pelotudo pelotuda huevon huevona gilipollas follar follando follada culiar culiao malparido malparida gonorrea hijueputa violar violacion violador nazi nazis porno puton putero",
};
const BLOCKED = new Set((BLOCKED_BY_LANG[LANG] ?? "").split(" "));

// --- afixos ---------------------------------------------------------------
const rules = { SFX: new Map(), PFX: new Map() }; // flag -> { cross, list: [{strip, add, cont, re}] }
const aff = fs.readFileSync(affPath, "utf8").replace(/^﻿/, "").split("\n");
for (const line of aff) {
  const p = line.trim().split(/\s+/);
  if (p[0] !== "SFX" && p[0] !== "PFX") continue;
  const [kind, flag] = p;
  if (p[2] === "Y" || p[2] === "N") {
    rules[kind].set(flag, { cross: p[2] === "Y", list: [] });
    continue;
  }
  const group = rules[kind].get(flag);
  if (!group) continue;
  const [, , stripText, addText, cond = "."] = p;
  const [add, cont = ""] = addText.split("/");
  group.list.push({
    strip: stripText === "0" ? "" : stripText,
    add: add === "0" ? "" : add,
    cont: [...cont],
    re:
      cond === "."
        ? null
        : new RegExp(kind === "SFX" ? `(?:${cond})$` : `^(?:${cond})`),
  });
}
const applySuffix = (word, flags, depth, out) => {
  for (const f of flags) {
    const group = rules.SFX.get(f);
    if (!group) continue;
    for (const r of group.list) {
      if (r.re && !r.re.test(word)) continue;
      if (r.strip && !word.endsWith(r.strip)) continue;
      const next = word.slice(0, word.length - r.strip.length) + r.add;
      out.push([next, group.cross]);
      if (depth > 0 && r.cont.length) applySuffix(next, r.cont, depth - 1, out);
    }
  }
};
const applyPrefix = (word, flags, out) => {
  for (const f of flags) {
    const group = rules.PFX.get(f);
    if (!group) continue;
    for (const r of group.list) {
      if (r.re && !r.re.test(word)) continue;
      if (r.strip && !word.startsWith(r.strip)) continue;
      out.push(r.add + word.slice(r.strip.length));
    }
  }
};

// --- expansão ---------------------------------------------------------------
const words = new Set();
const keep = (w) => {
  if (w !== w.toLowerCase()) return;
  const s = strip(w);
  if (/^[a-zñ]{2,9}$/.test(s) && !BLOCKED.has(s)) words.add(s.toUpperCase());
};
const lines = fs
  .readFileSync(dicPath, "utf8")
  .replace(/^﻿/, "")
  .split("\n")
  .slice(1);
for (const line of lines) {
  const [stem, flagText = ""] = line.trim().split("/");
  if (!stem || stem !== stem.toLowerCase()) continue; // maiúscula = nome próprio/sigla
  const flags = [...flagText];
  keep(stem);
  const suffixed = [];
  applySuffix(stem, flags, 1, suffixed);
  for (const [w] of suffixed) keep(w);
  const prefixed = [];
  applyPrefix(stem, flags, prefixed);
  for (const w of prefixed) keep(w);
  for (const [w, cross] of suffixed)
    if (cross) {
      const both = [];
      applyPrefix(w, flags, both);
      for (const x of both) keep(x);
    }
}
fs.mkdirSync(output.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
fs.writeFileSync(output, [...words].sort().join("\n") + "\n");
const byLength = {};
for (const w of words) byLength[w.length] = (byLength[w.length] ?? 0) + 1;
console.log(`${words.size} formas`, byLength);
