import { bundledCatalog, setCatalog } from "../data/catalog";
import { bundledCast, MOODS, setCast } from "../game/opponents";
import { firebaseConfig } from "../services/firebaseConfig";
import { contentStore, type Player } from "../services/repository";
import { reportError, track } from "../services/telemetry";
import { prefetchAssets } from "./assets";
import { CONTENT_SCHEMA, validateContent, type GameContent } from "./validate";

/**
 * Conteúdo do jogo: o que vem no app e o publicado no servidor (Realtime Database, em
 * `content/version` e `content/data`, este como texto JSON).
 *
 * - Na abertura, antes da primeira tela, o app põe em uso o último conteúdo baixado (se for válido
 *   e mais novo que o do app). Fases e rivais não mudam no meio de uma sessão.
 * - Depois, em segundo plano, confere se há versão nova; se houver, baixa, valida, guarda e já
 *   adianta as imagens. Ela entra em uso na próxima abertura.
 */
export const BUNDLED_CONTENT: GameContent = {
  schema: CONTENT_SCHEMA,
  /** O conteúdo do app vale como versão 0: qualquer publicação no servidor é mais nova. */
  version: 0,
  catalog: bundledCatalog,
  cast: bundledCast,
};
let active: GameContent = BUNDLED_CONTENT;
/** Versão em uso (0 = a do app). */
export const contentVersion = () => active.version;

const CONTENT_URL = `${firebaseConfig.databaseURL}/content`;

function apply(content: GameContent) {
  setCatalog(content.catalog);
  setCast(content.cast);
  active = content;
}

/**
 * Build de teste com `VITE_ONLY_BUNDLED_CONTENT=1`: joga só com o conteúdo que veio no app, sem o
 * guardado nem o do servidor (para testar fases novas antes de publicá-las).
 */
const ONLY_BUNDLED = import.meta.env.VITE_ONLY_BUNDLED_CONTENT === "1";

/** Abertura do app: usa o conteúdo guardado, se houver um válido e mais novo que o do app. */
export async function startContent() {
  if (ONLY_BUNDLED) return;
  try {
    const cached = (await contentStore.load()) as GameContent | undefined;
    if (
      cached &&
      cached.version > BUNDLED_CONTENT.version &&
      validateContent(cached).length === 0
    )
      apply(cached);
  } catch {
    /* Sem cache legível: segue com o conteúdo do app. */
  }
}

/** Imagens do servidor citadas pelo conteúdo (mapas, temas e os seis rostos de cada rival). */
export function contentImages(content: GameContent) {
  return [
    ...content.catalog.worlds.map((w) => w.art),
    ...content.catalog.casual.flatMap((t) => (t.art ? [t.art] : [])),
    ...content.cast.opponents.flatMap((o) =>
      o.art ? MOODS.map((m) => `${o.art}-${m}.webp`) : [],
    ),
  ].filter((u) => u.startsWith("https://"));
}

/**
 * Imagens que o jogador vai ver logo: o mapa e os rivais do mundo da próxima fase e do seguinte,
 * e as ilustrações dos temas. O resto é baixado quando aparecer.
 */
export function upcomingImages(content: GameContent, player: Player) {
  const { levels, worlds, casual } = content.catalog;
  const next = levels.find((l) => !player.stars[l.id]) ?? levels.at(-1);
  const at = Math.max(
    0,
    worlds.findIndex((w) => w.id === next?.world),
  );
  const near = new Set(worlds.slice(at, at + 2).map((w) => w.id));
  const rivals = new Set(
    levels
      .filter((l) => near.has(l.world))
      .map((l) => content.cast.byLevel[String(l.number)]),
  );
  return [
    ...worlds.filter((w) => near.has(w.id)).map((w) => w.art),
    ...casual.flatMap((t) => (t.art ? [t.art] : [])),
    ...content.cast.opponents
      .filter((o) => o.art && rivals.has(o.id))
      .flatMap((o) => MOODS.map((m) => `${o.art}-${m}.webp`)),
  ].filter((u) => u.startsWith("https://"));
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type RefreshResult = "current" | "stored" | "invalid" | "offline";
/**
 * Confere o servidor e guarda uma versão nova (para a próxima abertura). Também adianta as
 * imagens que o jogador vai ver logo, da versão nova ou, sem novidade, da que está em uso.
 */
export async function refreshContent(player: Player): Promise<RefreshResult> {
  if (ONLY_BUNDLED) return "current";
  let latest: unknown;
  try {
    latest = await getJson(`${CONTENT_URL}/version.json`);
  } catch {
    return "offline";
  }
  const cached = (await contentStore.load().catch(() => undefined)) as
    GameContent | undefined;
  const have = Math.max(active.version, cached?.version ?? 0);
  if (typeof latest !== "number" || latest <= have) {
    void prefetchAssets(upcomingImages(cached ?? active, player));
    return "current";
  }
  let content: GameContent;
  try {
    const textData = await getJson(`${CONTENT_URL}/data.json`);
    content = JSON.parse(String(textData));
  } catch {
    return "offline";
  }
  const errors = validateContent(content);
  if (errors.length || content.version !== latest) {
    reportError(
      new Error(
        `Conteúdo ${latest} recusado: ${errors.slice(0, 5).join("; ") || "versão diferente"}`,
      ),
    );
    return "invalid";
  }
  await contentStore.save(content);
  track("content_downloaded", { version: content.version });
  // Imagens que nenhuma das versões cita (a em uso e a nova) não servem mais.
  void contentStore
    .pruneAssets(new Set([...contentImages(active), ...contentImages(content)]))
    .catch(() => {});
  void prefetchAssets(upcomingImages(content, player));
  return "stored";
}

/** Só para testes: volta ao conteúdo do app. */
export function resetContent() {
  apply(BUNDLED_CONTENT);
}
