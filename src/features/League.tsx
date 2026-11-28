import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Clock3, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { create } from "zustand";
import {
  TIERS,
  demoteCount,
  promoteCount,
  rankGroup,
  tierUp,
  weekEnd,
  type Tier,
  type WeekResult,
} from "../../functions/league.js";
import { FramedAvatar } from "../components/FrameArt";
import { today } from "../data/catalog";
import { avatarOf } from "../game/avatars";
import { isFrameId } from "../game/frames";
import { leagueNow } from "../game/league";
import { rewardOf } from "../game/loginReward";
import {
  claimLeagueResult,
  leagueAvailable,
  leagueBackend,
  syncLeague,
  type LeagueEntry,
} from "../services/league";
import type { Player } from "../services/repository";
import { buzz } from "../services/haptics";
import { playSfx } from "../services/sound";
import { track } from "../services/telemetry";
import { usePlayer } from "../stores/player";
import { leagueT as t } from "../i18n/screens";

/**
 * Ligas semanais (plano: docs/planos/ligas-semanais.md; referência:
 * docs/referencias/ligas/ligas-chatgpt.png): a tela /liga, o card da tela inicial, a folha do
 * resultado da semana e a sincronização (envio do XP e leitura do grupo).
 */

/** Emblema de cada liga (gerados no ChatGPT; public/art/ligas). */
export const tierArt = (tier: Tier) => `/art/ligas/${tier}.webp`;

type Status = "idle" | "loading" | "ready" | "offline";
interface LeagueStore {
  status: Status;
  /** uid deste aparelho no servidor (para achar a linha "Você"). */
  me?: string;
  entries: LeagueEntry[];
  /** Resultado da semana passada ainda não mostrado. */
  result?: WeekResult;
  set: (patch: Partial<LeagueStore>) => void;
}
export const useLeague = create<LeagueStore>((set) => ({
  status: "idle",
  entries: [],
  set: (patch) => set(patch),
}));

const playerDeps = () => ({
  get: () => usePlayer.getState().player,
  update: (fn: (p: Player) => Player) => usePlayer.getState().update(fn),
});

/**
 * Envia o XP pendente, paga o resultado da semana passada (uma vez) e lê o grupo desta semana.
 * Sem internet, a liga fica "offline" e o XP continua guardado.
 */
export async function refreshLeague() {
  const store = useLeague.getState();
  if (!leagueAvailable()) return store.set({ status: "offline" });
  if (store.status === "idle") store.set({ status: "loading" });
  try {
    const deps = playerDeps();
    const server = await leagueBackend();
    const me = await server.uid();
    await syncLeague(deps);
    const state = await server.state();
    let result: WeekResult | undefined;
    deps.update((p) => {
      const claimed = claimLeagueResult(p, state);
      result = claimed.result;
      return claimed.player;
    });
    if (result)
      track("league_result", {
        tier: result.tier,
        rank: result.rank,
        size: result.size,
        moved: result.moved,
      });
    const cur = leagueNow(deps.get());
    const entries = cur.seat
      ? await server.group({ week: cur.week, ...cur.seat })
      : [];
    useLeague.getState().set({
      status: "ready",
      me,
      entries,
      ...(result ? { result } : {}),
    });
  } catch {
    useLeague.getState().set({ status: "offline" });
  }
}

/**
 * Fica montado no app: alguns segundos depois de abrir, sincroniza a liga; depois, envia o XP
 * sempre que ele aumenta (ao terminar cada jogada que rendeu XP).
 */
export function LeagueSync() {
  const xp = usePlayer((s) => s.player.league?.xp ?? 0);
  const ready = usePlayer((s) => s.player.tutorialDone);
  // Quem nunca fez XP de liga não tem o que enviar nem resultado para ler: o Firebase só é baixado
  // quando há liga (ou ao abrir /liga).
  const joined = usePlayer((s) => !!(s.player.league || s.player.leagueTier));
  useEffect(() => {
    if (!ready || !joined) return;
    const timer = window.setTimeout(() => void refreshLeague(), 3000);
    return () => window.clearTimeout(timer);
  }, [ready, joined]);
  useEffect(() => {
    if (ready && xp > 0) void syncLeague(playerDeps());
  }, [ready, xp]);
  return null;
}

interface Row extends LeagueEntry {
  mine: boolean;
}
/**
 * Classificação do grupo como o jogador a vê: a linha dele com o XP do aparelho (que pode estar à
 * frente do servidor) e, antes do primeiro envio, a linha dele no fim.
 */
export function standings(
  entries: LeagueEntry[],
  me: string | undefined,
  p: Player,
  now = Date.now(),
): Row[] {
  const cur = leagueNow(p, now);
  const rows: Row[] = entries.map((e) => ({ ...e, mine: e.uid === me }));
  const mine = rows.find((r) => r.mine);
  if (mine) mine.xp = Math.max(mine.xp, cur.xp);
  else if (cur.xp > 0)
    rows.push({
      uid: me ?? "me",
      name: p.name,
      avatar: p.avatar,
      ...(p.frame ? { frame: p.frame } : {}),
      xp: cur.xp,
      at: Infinity,
      mine: true,
    });
  return rankGroup(rows);
}

/** Liga do jogador agora: a do assento desta semana, ou a última que o servidor disse. */
const tierOfPlayer = (p: Player, now = Date.now()): Tier =>
  leagueNow(p, now).seat?.tier ?? p.leagueTier ?? "bronze";

function Emblem({ tier, size }: { tier: Tier; size: number }) {
  return (
    <img
      className="league-emblem"
      src={tierArt(tier)}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  );
}

/** Tela /liga: as ligas, a regra da semana, o tempo que falta e a classificação do grupo. */
export function LeaguePage() {
  const player = usePlayer((s) => s.player);
  const { status, entries, me } = useLeague();
  useEffect(() => {
    track("league_view");
    void refreshLeague();
  }, []);
  const now = Date.now();
  const cur = leagueNow(player, now);
  const tier = tierOfPlayer(player, now);
  // Sem o grupo lido (carregando ou sem internet), a lista não aparece: sozinho, o jogador seria
  // sempre o 1º. Fica o XP da semana guardado no aparelho.
  const rows = entries.length ? standings(entries, me, player, now) : [];
  const size = rows.length;
  const up = tier === "diamante" ? 0 : promoteCount(size);
  const down = tier === "bronze" ? 0 : demoteCount(size);
  return (
    <div className="league-page">
      <div className="page-heading league-heading">
        <h1>{t.title}</h1>
      </div>
      <ol className="league-tiers" aria-label={t.tiersLabel}>
        {TIERS.map((id) => (
          <li
            key={id}
            className={id === tier ? "current" : ""}
            aria-current={id === tier ? "true" : undefined}
          >
            <Emblem tier={id} size={56} />
            <span>{t.tiers[id]}</span>
          </li>
        ))}
      </ol>
      <section className="league-info" aria-label={t.current}>
        <Emblem tier={tier} size={64} />
        <h2>{t.league(t.tiers[tier])}</h2>
        <p>
          {tier === "diamante"
            ? t.topLeague
            : t.topRise(size ? promoteCount(size) : 10, t.tiers[tierUp(tier)])}
        </p>
        <span className="league-ends">
          <Clock3 size={16} aria-hidden="true" />{" "}
          {t.endsIn(weekEnd(cur.week) - now)}
        </span>
      </section>
      <section className="league-board" aria-label={t.groupLabel}>
        {!rows.length ? (
          <p className="league-empty">
            {status === "loading"
              ? t.loading
              : cur.xp > 0
                ? t.weekXp(cur.xp)
                : t.joinHint}
            <small>
              <Sparkles size={14} aria-hidden="true" /> {t.howXp}
            </small>
          </p>
        ) : (
          <>
            <div className="league-board-head" aria-hidden="true">
              <span>#</span>
              <span>{t.player}</span>
              <span>{t.xp}</span>
            </div>
            <ol className="league-rows">
              {rows.map((r, i) => {
                const rank = i + 1;
                const frame = isFrameId(r.frame) ? r.frame : undefined;
                return (
                  <li
                    key={r.uid}
                    className={`league-row ${r.mine ? "mine" : ""} ${rank <= up && r.xp > 0 ? "promo" : ""} ${rank > size - down ? "demo" : ""}`}
                  >
                    {/* As faixas ficam entre as linhas, onde a zona começa ou termina. */}
                    {rank === size - down + 1 && down > 0 && (
                      <span className="league-zone demo">
                        <ArrowDown size={14} aria-hidden="true" /> {t.demo}
                      </span>
                    )}
                    <span className={`league-rank r${rank}`}>
                      <span className="sr-only">{t.rank} </span>
                      {rank}
                    </span>
                    <FramedAvatar
                      opponent={avatarOf(r.avatar)}
                      size={30}
                      frame={frame}
                    />
                    <span className="league-name">
                      {r.mine ? t.you : r.name}
                    </span>
                    <span className="league-xp">{t.xpValue(r.xp)}</span>
                    {rank === up && rank < size && (
                      <span className="league-zone promo">
                        <ArrowUp size={14} aria-hidden="true" /> {t.promo}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {status === "offline" && cur.xp > 0 && (
          <p className="league-offline">{t.offline}</p>
        )}
      </section>
    </div>
  );
}

/** Card da liga na tela inicial: emblema, posição, tempo que falta e "Ver liga". */
export function LeagueHomeCard() {
  const player = usePlayer((s) => s.player);
  const { entries, me } = useLeague();
  const now = Date.now();
  const cur = leagueNow(player, now);
  const tier = tierOfPlayer(player, now);
  // A posição só vale com o grupo lido do servidor (sozinho, o jogador seria sempre o 1º).
  const rows = entries.length ? standings(entries, me, player, now) : [];
  const rank = rows.findIndex((r) => r.mine) + 1;
  return (
    <section className="league-card" aria-label={t.league(t.tiers[tier])}>
      <Emblem tier={tier} size={48} />
      <span className="league-card-text">
        <strong>{t.league(t.tiers[tier])}</strong>
        <small>
          {rank > 0
            ? t.place(rank)
            : cur.xp > 0
              ? t.xpValue(cur.xp)
              : t.cardJoin}
          {(rank > 0 || cur.xp > 0) && (
            <span className="league-card-ends">
              {" · "}
              <Clock3 size={13} aria-hidden="true" />{" "}
              <span className="sr-only">
                {t.endsShort(weekEnd(cur.week) - now)}
              </span>
              <span aria-hidden="true">
                {t.leftShort(weekEnd(cur.week) - now)}
              </span>
            </span>
          )}
        </small>
      </span>
      <Link
        className="league-card-cta"
        to="/liga"
        onClick={() => track("home_league_card")}
      >
        {t.seeLeague}
      </Link>
    </section>
  );
}

/**
 * Folha "Fim da semana" na tela inicial, com o resultado que acabou de chegar (as moedas já foram
 * pagas ao ler). Espera a recompensa diária do dia, para não abrir duas janelas juntas.
 */
export function LeagueResultFlow() {
  const result = useLeague((s) => s.result);
  const clear = useLeague((s) => s.set);
  const player = usePlayer((s) => s.player);
  const dailyDone =
    player.tutorialDone && rewardOf(player.loginReward, today()).claimed;
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!result || !dailyDone || played) return;
    setPlayed(true);
    if (result.moved === "up" || result.coins > 0) {
      playSfx(player.sound, "win");
      buzz(player.vibration, "win");
    }
  }, [result, dailyDone, played, player.sound, player.vibration]);
  if (!result || !dailyDone) return null;
  const tier = result.tier;
  const lead =
    result.moved === "up"
      ? t.resultUp
      : result.moved === "down"
        ? t.resultDown
        : t.resultStay;
  return (
    <div className="swap-backdrop result-backdrop league-backdrop">
      <motion.div
        className={`swap-dialog result-dialog league-dialog ${result.moved}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.weekOver}
        initial={player.animations ? { opacity: 0, scale: 0.85, y: 16 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        {result.moved === "up" && (
          <span className="result-rays" aria-hidden="true" />
        )}
        <h2>{t.weekOver}</h2>
        <p className="league-ribbon">
          {lead}{" "}
          <b>
            {t.league(t.tiers[tier])}
            {result.moved === "up" ? "!" : ""}
          </b>
        </p>
        {result.moved === "up" && (
          <span className="league-confetti" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        )}
        <span className="league-trophy">
          <Emblem tier={tier} size={150} />
        </span>
        <p className="league-finished">{t.finished(result.rank)}</p>
        {result.coins > 0 && (
          <p className="league-coins">
            <img src="/art/loja/moedas.webp" alt="" draggable={false} />
            {t.coins(result.coins)}
          </p>
        )}
        {result.moved === "down" && (
          <p className="league-down-note">{t.resultDownNote}</p>
        )}
        <button
          type="button"
          className="button primary league-continue"
          autoFocus
          onClick={() => clear({ result: undefined })}
        >
          {t.continue}
        </button>
      </motion.div>
    </div>
  );
}
