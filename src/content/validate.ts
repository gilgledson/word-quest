import type { Catalog } from "../data/catalog";
import {
  gridSpec,
  PuzzleValidator,
  type Puzzle,
} from "../game/crossword-engine";
import { MOODS, type Cast } from "../game/opponents";

/**
 * Conteúdo do jogo que pode chegar pelo servidor: catálogo (mundos, fases, variantes, temas) e
 * elenco (rivais e o rival de cada fase). `version` sobe a cada publicação; `schema` muda só
 * quando o formato muda, e o app ignora formatos que não conhece.
 */
export interface GameContent {
  schema: number;
  version: number;
  catalog: Catalog;
  cast: Cast;
}
export const CONTENT_SCHEMA = 1;
/** Imagens de fora do app só deste servidor (Firebase Hosting do projeto). */
export const CONTENT_HOSTS = [
  "https://wordquest-online.web.app/",
  "https://wordquest-online.firebaseapp.com/",
];
/** Imagem válida: dentro do app (/art/...) ou num servidor de conteúdo conhecido. */
export const validArt = (art: unknown) =>
  typeof art === "string" &&
  (/^\/art\/[\w\-/.]+$/.test(art) ||
    CONTENT_HOSTS.some((h) => art.startsWith(h) && !art.includes("..")));

const LEVELS = ["facil", "medio", "dificil"];
const STYLES = ["cuidadoso", "agressivo"];
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string" && v.trim() !== "";

/** Erros de uma grade: as mesmas regras das fases e do casual que vêm no app. */
function gridErrors(p: Puzzle, casual: boolean): string[] {
  if (!isRecord(p) || !Array.isArray(p.words) || !text(p.id))
    return ["grade malformada"];
  // Os mesmos tamanhos das fases; as fases têm um mínimo de palavras por tamanho, o casual (grade
  // aberta, só palavras do tema) não.
  const spec = casual ? gridSpec(p) && { minWords: 0 } : gridSpec(p);
  if (!spec) return [`${p.id}: tamanho fora do padrão`];
  try {
    const errors = casual
      ? PuzzleValidator.validateCasual(p)
      : PuzzleValidator.validateCatalog(p);
    if (p.words.length < spec.minWords) errors.push("poucas palavras");
    return errors.map((e) => `${p.id}: ${e}`);
  } catch {
    return [`${p.id}: grade malformada`];
  }
}

/**
 * Confere o conteúdo inteiro antes de usá-lo: formato, grades jogáveis, referências entre as
 * partes (fase → mundo, fase → rival) e imagens só de origens permitidas. Lista vazia = válido.
 * A publicação (scripts/publish-content.mjs) roda isto e ainda joga cada grade até o fim.
 */
export function validateContent(raw: unknown): string[] {
  if (!isRecord(raw)) return ["conteúdo malformado"];
  const c = raw as unknown as GameContent;
  const errors: string[] = [];
  if (c.schema !== CONTENT_SCHEMA)
    errors.push(`formato ${c.schema} desconhecido`);
  if (!Number.isInteger(c.version) || c.version < 1)
    errors.push("versão inválida");
  if (!isRecord(c.catalog) || !isRecord(c.cast))
    return [...errors, "partes ausentes"];
  const { worlds, levels, variants, casual } = c.catalog;
  const { opponents, byLevel } = c.cast;
  if (
    !Array.isArray(worlds) ||
    !Array.isArray(levels) ||
    !isRecord(variants) ||
    !Array.isArray(casual) ||
    !Array.isArray(opponents) ||
    !isRecord(byLevel)
  )
    return [...errors, "listas ausentes"];

  // Mundos.
  const worldIds = new Set<string>();
  for (const w of worlds) {
    if (!isRecord(w) || !/^[a-z0-9-]+$/.test(String(w.id)))
      errors.push("mundo sem id");
    else if (worldIds.has(w.id)) errors.push(`mundo ${w.id} repetido`);
    else worldIds.add(w.id);
    if (!text(w?.nome) || !text(w?.start))
      errors.push(`mundo ${w?.id}: textos`);
    if (!validArt(w?.art)) errors.push(`mundo ${w?.id}: imagem não permitida`);
  }
  if (!worlds.length) errors.push("nenhum mundo");

  // Fases: numeradas 1..N em ordem, cada mundo num trecho seguido do caminho.
  const levelIds = new Set<string>();
  const seenWorlds: string[] = [];
  levels.forEach((l, i) => {
    if (!isRecord(l)) return errors.push("fase malformada");
    if (l.number !== i + 1) errors.push(`fase ${l.id}: número fora de ordem`);
    if (levelIds.has(l.id)) errors.push(`fase ${l.id} repetida`);
    levelIds.add(l.id);
    if (!worldIds.has(l.world)) errors.push(`fase ${l.id}: mundo inexistente`);
    if (seenWorlds.at(-1) !== l.world) {
      if (seenWorlds.includes(l.world))
        errors.push(`mundo ${l.world}: fases fora de sequência`);
      seenWorlds.push(l.world);
    }
    errors.push(...gridErrors(l, false));
  });
  if (!levels.length) errors.push("nenhuma fase");
  for (const w of worldIds)
    if (!seenWorlds.includes(w)) errors.push(`mundo ${w} sem fases`);
  // O tutorial aponta para palavras da fase 1: ela não tem variantes.
  if (levels[0] && variants[levels[0].id]) errors.push("fase 1 com variantes");
  for (const [id, list] of Object.entries(variants)) {
    const level = levels.find((l) => l.id === id);
    if (!level || !Array.isArray(list)) {
      errors.push(`variantes de ${id}: fase inexistente`);
      continue;
    }
    list.forEach((words, k) =>
      errors.push(
        ...gridErrors({ ...level, id: `${id}#${k + 1}`, words }, false),
      ),
    );
  }

  // Temas do casual: ids "casual-..." nas grades (o app reconhece o modo pelo prefixo).
  const themeIds = new Set<string>();
  const casualIds = new Set<string>();
  for (const t of casual) {
    if (!isRecord(t) || !/^[a-z0-9-]+$/.test(String(t.id))) {
      errors.push("tema sem id");
      continue;
    }
    if (themeIds.has(t.id)) errors.push(`tema ${t.id} repetido`);
    themeIds.add(t.id);
    if (!text(t.nome)) errors.push(`tema ${t.id}: nome`);
    if (t.art !== undefined && !validArt(t.art))
      errors.push(`tema ${t.id}: imagem não permitida`);
    for (const color of [t.color, t.colorSoft])
      if (color !== undefined && !/^#[0-9a-f]{6}$/i.test(String(color)))
        errors.push(`tema ${t.id}: cor inválida`);
    if (!Array.isArray(t.puzzles) || !t.puzzles.length) {
      errors.push(`tema ${t.id}: sem grades`);
      continue;
    }
    for (const p of t.puzzles) {
      if (!String(p?.id).startsWith("casual-"))
        errors.push(`tema ${t.id}: id de grade sem "casual-"`);
      if (casualIds.has(p?.id) || levelIds.has(p?.id))
        errors.push(`grade ${p?.id} repetida`);
      casualIds.add(p?.id);
      errors.push(...gridErrors(p, true));
    }
  }

  // Elenco.
  const castIds = new Set<string>();
  for (const o of opponents) {
    if (!isRecord(o) || !/^[a-z0-9-]+$/.test(String(o.id))) {
      errors.push("rival sem id");
      continue;
    }
    if (castIds.has(o.id)) errors.push(`rival ${o.id} repetido`);
    castIds.add(o.id);
    if (
      !LEVELS.includes(o.level as string) ||
      !STYLES.includes(o.style as string)
    )
      errors.push(`rival ${o.id}: nível ou estilo`);
    for (const field of ["name", "species", "tagline", "win", "lose"] as const)
      if (!text(o[field])) errors.push(`rival ${o.id}: ${field}`);
    if (o.art !== undefined && !validArt(`${o.art}-${MOODS[0]}.webp`))
      errors.push(`rival ${o.id}: imagem não permitida`);
  }
  // Partidas antigas sem personagem usam o cuidadoso do nível: os três níveis precisam de um.
  for (const level of LEVELS)
    if (!opponents.some((o) => o.level === level && o.style === "cuidadoso"))
      errors.push(`nenhum rival cuidadoso no nível ${level}`);
  for (const l of levels)
    if (!castIds.has(byLevel[String(l.number)]))
      errors.push(`fase ${l.number}: rival inexistente`);
  return errors;
}
