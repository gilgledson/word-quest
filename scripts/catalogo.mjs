// Catálogo de palavras e pistas: scripts/data/catalogo.json é a fonte única das grades (fases e casual).
// Cada entrada: { palavra, pista, nivel: "facil" | "medio" | "dificil", tipo: "geral" | id de tema }.
// Os tipos são os temas do modo casual (scripts/data/themes.json); o que não é de nenhum tema é "geral".
//
// Uso:
//   node scripts/catalogo.mjs --migrar            junta clues*.txt antigos + temas no catalogo.json (uma vez)
//   node scripts/catalogo.mjs --add arquivo.txt   acrescenta linhas PALAVRA|Pista[|nivel[|tipo]] (valida antes)
//                             [--nivel medio] [--tipo animais] [--troca]
//   node scripts/catalogo.mjs --resumo            conta por nível e tipo
import fs from "node:fs";
import path from "node:path";
import {
  validateEntry,
  loadDictionary,
  loadCatalog,
  saveCatalog,
  NIVEIS,
  strip,
  dir,
} from "./check-clues.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const value = (n) =>
  args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined;
const themes = JSON.parse(
  fs.readFileSync(path.join(dir, "themes.json"), "utf8"),
);
const TIPOS = ["geral", ...Object.keys(themes)];
const TIER_NIVEL = { 1: "facil", 2: "medio", 3: "dificil" };

/** Valida e junta entradas novas; a existente só é trocada com `troca`. */
function juntar(catalogo, novas, troca = false) {
  const dictionary = loadDictionary();
  const porPalavra = new Map(catalogo.map((e) => [e.palavra, e]));
  const pistas = new Map(
    catalogo.map((e) => [strip(e.pista).toLowerCase(), e.palavra]),
  );
  const problemas = [];
  let adicionadas = 0;
  for (const nova of novas) {
    const e = { ...nova, palavra: strip(nova.palavra).toUpperCase() };
    const existente = porPalavra.get(e.palavra);
    if (existente && !troca) continue;
    if (existente) pistas.delete(strip(existente.pista).toLowerCase());
    const falha =
      validateEntry(e, dictionary, pistas) ||
      (!NIVEIS.includes(e.nivel) && `nível inválido (${e.nivel})`) ||
      (!TIPOS.includes(e.tipo) && `tipo inválido (${e.tipo})`);
    if (falha) {
      problemas.push(`${e.palavra}: ${falha}: ${e.pista}`);
      if (existente)
        pistas.set(strip(existente.pista).toLowerCase(), e.palavra);
      continue;
    }
    pistas.set(strip(e.pista).toLowerCase(), e.palavra);
    porPalavra.set(e.palavra, e);
    adicionadas++;
  }
  return { catalogo: [...porPalavra.values()], adicionadas, problemas };
}

if (flag("migrar")) {
  const legado = fs
    .readdirSync(dir)
    .filter((f) => /^clues.*\.txt$/.test(f))
    .sort((a, b) =>
      a === "clues.txt" ? -1 : b === "clues.txt" ? 1 : a.localeCompare(b),
    );
  const tipoDe = new Map();
  for (const [id, t] of Object.entries(themes))
    for (const w of (t.palavras ?? "").split(/\s+/).filter(Boolean))
      if (!tipoDe.has(w)) tipoDe.set(w, id);
  const ultimo = new Map(); // o último arquivo vence
  for (const f of legado)
    for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const [raw, pista = "", tier = "1"] = line.split("|");
      const palavra = strip(raw.trim()).toUpperCase();
      ultimo.set(palavra, {
        palavra,
        pista: pista.trim(),
        nivel: TIER_NIVEL[Number(tier)] ?? "facil",
        tipo: tipoDe.get(palavra) ?? "geral",
      });
    }
  const { catalogo, adicionadas, problemas } = juntar([], [...ultimo.values()]);
  saveCatalog(catalogo);
  console.log(
    `migradas ${adicionadas} palavras; ${problemas.length} recusadas por regra`,
  );
  console.log(problemas.slice(0, 40).join("\n"));
  fs.mkdirSync(path.join(dir, "legado"), { recursive: true });
  for (const f of legado)
    fs.renameSync(path.join(dir, f), path.join(dir, "legado", f));
  console.log(
    `arquivos antigos movidos para scripts/data/legado (${legado.length})`,
  );
} else if (flag("add")) {
  const nivelPadrao = value("nivel") ?? "facil";
  const tipoPadrao = value("tipo") ?? "geral";
  const novas = fs
    .readFileSync(value("add"), "utf8")
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => {
      const [palavra, pista, nivel, tipo] = l.split("|").map((s) => s.trim());
      return {
        palavra,
        pista,
        nivel: NIVEIS.includes(nivel)
          ? nivel
          : (TIER_NIVEL[nivel] ?? nivelPadrao),
        tipo: tipo || tipoPadrao,
      };
    });
  const { catalogo, adicionadas, problemas } = juntar(
    loadCatalog(),
    novas,
    flag("troca"),
  );
  saveCatalog(catalogo);
  console.log(`acrescentadas ${adicionadas}; recusadas ${problemas.length}`);
  console.log(problemas.join("\n"));
} else {
  const c = loadCatalog();
  const cont = {};
  for (const e of c)
    cont[`${e.nivel}/${e.tipo}`] = (cont[`${e.nivel}/${e.tipo}`] ?? 0) + 1;
  console.log(`${c.length} palavras`, cont);
}
