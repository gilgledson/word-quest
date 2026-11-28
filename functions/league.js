/**
 * Regras puras das ligas semanais (sem Firebase): a semana, a ordem das ligas e o fechamento de um
 * grupo (quem sobe, quem desce e as moedas de cada um). Usadas pelas Functions (index.js) e pelo
 * app (src/game/league.ts); testadas em src/tests/ligas.test.ts.
 * Plano: docs/planos/ligas-semanais.md.
 */

/** Ligas, da mais baixa à mais alta. Todo mundo começa no Bronze. */
export const TIERS = ["bronze", "prata", "ouro", "cristal", "diamante"];
/** Tamanho máximo de um grupo. */
export const GROUP_SIZE = 30;
/** Quem passa disto na semana fica fora da classificação (XP impossível de fazer jogando). */
export const WEEK_XP_CAP = 40_000;
/** Moedas pelo 1º, 2º e 3º lugar. */
export const PODIUM_COINS = [100, 60, 40];
/** Moedas extras para quem sobe de liga. */
export const PROMOTION_COINS = 20;
/** Grupos menores que isto não rebaixam ninguém. */
export const DEMOTE_MIN_GROUP = 5;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Semana (segunda-feira 00:00 UTC, "AAAA-MM-DD") que contém o instante `now`. */
export function weekOf(now) {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = domingo
  const monday = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - ((day + 6) % 7),
  );
  return new Date(monday).toISOString().slice(0, 10);
}
/** Instante (ms) em que a semana começa. */
export const weekStart = (week) => Date.parse(`${week}T00:00:00Z`);
/** Instante (ms) em que a semana termina (a segunda seguinte, 00:00 UTC). */
export const weekEnd = (week) => weekStart(week) + WEEK_MS;
/** A semana anterior a `week`. */
export const previousWeek = (week) => weekOf(weekStart(week) - DAY_MS);

const tierIndex = (tier) => Math.max(0, TIERS.indexOf(tier));
/** Liga válida (uma desconhecida vira Bronze). */
export const tierOf = (tier) => TIERS[tierIndex(tier)];
/** Liga acima (o Diamante fica no Diamante). */
export const tierUp = (tier) =>
  TIERS[Math.min(TIERS.length - 1, tierIndex(tier) + 1)];
/** Liga abaixo (o Bronze fica no Bronze). */
export const tierDown = (tier) => TIERS[Math.max(0, tierIndex(tier) - 1)];

/**
 * Quantos sobem num grupo de `n`: um terço (arredondado para cima), no máximo 10. Num grupo cheio de
 * 30, os 10 primeiros; num grupo de 1 a 3, só o 1º.
 */
export const promoteCount = (n) => Math.min(10, Math.ceil(n / 3));
/** Quantos descem pela posição num grupo de `n` (15%, no máximo 5; nenhum abaixo de 5 pessoas). */
export const demoteCount = (n) =>
  n < DEMOTE_MIN_GROUP ? 0 : Math.min(5, Math.floor(n * 0.15));

/** XP que vale na classificação: acima do teto semanal (ou inválido) vale 0. */
const scoreOf = (xp) =>
  typeof xp === "number" && Number.isFinite(xp) && xp > 0 && xp <= WEEK_XP_CAP
    ? Math.floor(xp)
    : 0;

/**
 * Classificação do grupo: mais XP primeiro; no empate, quem chegou antes àquele XP (`at` menor);
 * depois o uid, para a ordem ser sempre a mesma.
 */
export function rankGroup(rows) {
  return rows
    .map((r) => ({ ...r, xp: scoreOf(r.xp) }))
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        (a.at ?? Infinity) - (b.at ?? Infinity) ||
        (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0),
    );
}

/**
 * Fecha um grupo da liga `tier`: para cada jogador, a posição, a nova liga, se subiu ("up"), desceu
 * ("down") ou ficou ("stay"), e as moedas ganhas.
 * - Sobem os `promoteCount(n)` primeiros com XP > 0 (o Diamante não sobe).
 * - Descem os `demoteCount(n)` últimos e todos com XP 0, só da Prata para cima e só se não subiram.
 * - Moedas: 100, 60 e 40 para o pódio (com XP > 0) e mais 20 para quem sobe.
 */
export function closeGroup(tier, rows) {
  const from = tierOf(tier);
  const ranked = rankGroup(rows);
  const size = ranked.length;
  const up = promoteCount(size);
  const down = demoteCount(size);
  const canUp = from !== TIERS.at(-1);
  const canDown = from !== TIERS[0] && size >= DEMOTE_MIN_GROUP;
  return ranked.map((r, i) => {
    const rank = i + 1;
    const scored = r.xp > 0;
    const moved =
      canUp && scored && rank <= up
        ? "up"
        : canDown && (!scored || rank > size - down)
          ? "down"
          : "stay";
    const coins =
      (scored ? (PODIUM_COINS[i] ?? 0) : 0) +
      (moved === "up" ? PROMOTION_COINS : 0);
    return {
      uid: r.uid,
      xp: r.xp,
      rank,
      size,
      from,
      tier:
        moved === "up"
          ? tierUp(from)
          : moved === "down"
            ? tierDown(from)
            : from,
      moved,
      coins,
    };
  });
}

/**
 * Próximo assento numa liga: entra no grupo aberto enquanto ele tem vaga; cheio, abre o seguinte.
 * `open` é o que está em `leagueOpen/{semana}/{liga}` (`{ group, count }`, ou nada no começo).
 */
export function nextSeat(open) {
  const group =
    Number.isInteger(open?.group) && open.group > 0 ? open.group : 1;
  const count =
    Number.isInteger(open?.count) && open.count > 0 ? open.count : 0;
  return count >= GROUP_SIZE
    ? { group: group + 1, count: 1 }
    : { group, count: count + 1 };
}

/**
 * Gravações do fechamento da semana `week`, a partir de `leagues/{week}` (liga → grupo → uid →
 * linha): para cada jogador, `leagueState/{uid}` com a nova liga e o resultado.
 */
export function closeWeekUpdates(week, leagues) {
  const updates = {};
  for (const [tier, groups] of Object.entries(leagues ?? {}))
    for (const [group, players] of Object.entries(groups ?? {})) {
      const rows = Object.entries(players ?? {}).map(([uid, row]) => ({
        uid,
        xp: row?.xp,
        at: row?.at,
      }));
      for (const r of closeGroup(tier, rows))
        updates[`leagueState/${r.uid}`] = {
          tier: r.tier,
          result: {
            week,
            group,
            from: r.from,
            tier: r.tier,
            rank: r.rank,
            size: r.size,
            xp: r.xp,
            moved: r.moved,
            coins: r.coins,
          },
        };
    }
  return updates;
}
