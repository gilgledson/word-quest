import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FramedAvatar } from "../components/FrameArt";
import { currentFrame } from "../game/frames";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  LockKeyhole,
  Flag,
  Volume2,
  Activity,
  Timer,
  BellRing,
  Contrast,
  Check,
  PawPrint,
  Utensils,
  Trees,
  Armchair,
  Shapes,
  Music,
  Vibrate,
  Crown,
  Trophy,
  Award,
  Pencil,
  Swords,
  Play,
  Star,
  ThumbsUp,
  BriefcaseBusiness,
  HeartPulse,
  Backpack,
  Languages,
} from "lucide-react";
import {
  achievementStatus,
  claimAchievement,
  claimableCount,
  type AchievementStatus,
} from "../game/achievements";
import { CoinIcon } from "../components/CoinIcon";
import road from "../data/map-road.json";
import { usePlayer } from "../stores/player";
import {
  dailyPuzzle,
  levels,
  today,
  maps,
  mapOf,
  worldLevels,
  casualThemes,
  type CasualTheme,
  themeArt,
  themeColors,
} from "../data/catalog";
import { OPPONENT_LEVELS, OPPONENT_STYLES } from "../game/opponent";
import { economy, PuzzleEngine } from "../game/crossword-engine";
import { currentStreak, dailyShareText } from "../game/dailyShare";
import { ShareResultButton } from "../components/ShareResultButton";
import type { Player } from "../services/repository";
import {
  OPPONENTS,
  OPPONENT_BY_LEVEL,
  opponentById,
  opponentFor,
} from "../game/opponents";
import { avatarOf, pickableAvatars } from "../game/avatars";
import { DailyRewardFlow } from "./DailyReward";
import {
  askReminderPermission,
  remindersSupported,
} from "../services/reminders";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { AssetImage } from "../components/AssetImage";
import { Deck } from "../components/Deck";
import { playSfx } from "../services/sound";
import { buzz } from "../services/haptics";
import { PlayGamesCard } from "./PlayGamesCard";
import { DuelCard } from "./DuelCard";
import { WorldCard } from "./WorldCard";
import { HomeShopCard, HomeVideoCard } from "./HomeCards";
import { onlineAvailable } from "../services/online";
import { appVersion } from "../services/liveUpdate";
import { canRateInStore, openStoreRating } from "../services/review";
import { changeLang, htmlLang, lang, LANGS, locale, type Lang } from "../i18n";
import { campaignT, casualT, dailyT, homeT, profileT } from "../i18n/screens";
export function Home() {
  const wins = usePlayer(
    (s) => levels.filter((l) => s.player.stars[l.id]).length,
  );
  const avatar = usePlayer((s) => s.player.avatar);
  return (
    <>
      {/* O título fica só para leitores de tela: a arte do mundo já abre a tela. */}
      <h1 className="sr-only">{wins ? homeT.titleGoing : homeT.titleStart}</h1>
      {onlineAvailable() && <DuelCard avatar={avatar} />}
      <WorldCard />
      {/* Vídeo premiado e loja: uma faixa própria (deitado, os dois ficam lado a lado). */}
      <div className="home-extras">
        <HomeVideoCard />
        <HomeShopCard />
      </div>
      <DailyRewardFlow />
    </>
  );
}
// Mapa em tela cheia, sem rolagem: a ilustração 3D (public/art/map-straight-v1.jpg) cobre a tela
// inteira (object-fit: cover) e as fases sobem pelo caminho desenhado nela
// (src/data/map-road.json: x de 0 a 1, da base ao topo da ilustração).
const IMG_W = 848;
const IMG_H = 1264;
/** Posição horizontal (em %) do centro do caminho a `fromBottom` px da base da ilustração. */
export const roadX = (fromBottom: number, tileHeight: number) => {
  const k = Math.floor(fromBottom / tileHeight);
  let t = (fromBottom - k * tileHeight) / tileHeight;
  if (k % 2) t = 1 - t; // ladrilhos ímpares estão espelhados na vertical
  const pos = t * (road.x.length - 1);
  const i = Math.min(road.x.length - 2, Math.floor(pos));
  const f = pos - i;
  return (road.x[i] * (1 - f) + road.x[i + 1] * f) * 100;
};
/** Rota /map/:world: mostra o mapa do mundo pedido (a Vila, se o nome não existir). */
export function WorldMap() {
  const { world } = useParams();
  return <Campaign key={world} world={world} />;
}
export function Campaign({ world = "vila" }: { world?: string }) {
  const p = usePlayer((s) => s.player);
  const map = mapOf(world);
  const list = worldLevels(map.id);
  const nextMap = maps[maps.indexOf(map) + 1];
  const prevMap = maps[maps.indexOf(map) - 1];
  const unlockedLevel = (l: (typeof list)[number]) =>
    l.number === 1 || !!p.stars[levels[l.number - 2].id];
  const worldDone = list.every((l) => p.stars[l.id]);
  const remaining = list.filter((l) => !p.stars[l.id]).length;
  const worldStars = list.reduce((n, l) => n + (p.stars[l.id] ?? 0), 0);
  const rivalOf = (number: number) => opponentById(OPPONENT_BY_LEVEL[number]);
  // As posições dependem do tamanho real da tela.
  const [box, setBox] = useState({ w: 360, h: 640 });
  const section = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const read = () => {
      if (el.clientWidth && el.clientHeight)
        setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = box;
  // Onde a ilustração cai na tela (cover, centralizada) e o caminho sobre ela.
  const scale = Math.max(w / IMG_W, h / IMG_H);
  const iw = IMG_W * scale;
  const ih = IMG_H * scale;
  const ox = (w - iw) / 2;
  const oy = (h - ih) / 2;
  const onRoad = (y: number) => {
    const up = Math.min(ih - 1, Math.max(0, ih - (y - oy)));
    return ox + (roadX(up, ih) / 100) * iw;
  };
  const yBottom = h - 140;
  const yTop = 170;
  // Com muitas fases o espaço entre elas encolhe: as bolinhas diminuem junto.
  const spacing = list.length > 1 ? (yBottom - yTop) / (list.length - 1) : 120;
  const node = Math.round(Math.max(34, Math.min(62, spacing * 0.64)));
  // Cada fase busca, perto da posição ideal, o trecho mais reto do caminho para que o nome
  // (logo abaixo da bolinha) também fique sobre as pedras.
  const stopY = (i: number) => {
    const ideal =
      list.length > 1
        ? yBottom - (i / (list.length - 1)) * (yBottom - yTop)
        : yBottom;
    let best = ideal;
    let bestCost = Infinity;
    for (let y = ideal - 60; y <= ideal + 60; y += 4) {
      if (y < yTop || y > yBottom) continue;
      const x = onRoad(y);
      const cost =
        Math.abs(onRoad(y + 26) - x) +
        Math.abs(onRoad(y + 52) - x) +
        Math.abs(y - ideal) * 0.05;
      if (cost < bestCost) {
        bestCost = cost;
        best = y;
      }
    }
    return best;
  };
  const current = list.findIndex((l) => !p.stars[l.id]);
  const here = current === -1 ? list.length - 1 : current;
  // Trecho já percorrido: do início até a fase atual (e um pouco além se ela já foi vencida).
  const reachedY = Math.max(
    yTop,
    stopY(here) - (p.stars[list[here].id] && here > 0 ? 24 : 0),
  );
  const startY = yBottom + 60;
  const progress = Array.from(
    { length: Math.ceil((startY - reachedY) / 12) + 1 },
    (_, k) => {
      const y = Math.max(reachedY, startY - k * 12);
      return `${k ? "L" : "M"} ${onRoad(y).toFixed(1)} ${y.toFixed(1)}`;
    },
  ).join(" ");
  return (
    <section
      className="campaign"
      ref={section}
      style={{ "--node": `${node}px` } as React.CSSProperties}
    >
      <AssetImage
        className="campaign-art"
        src={map.art}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <svg
        className="campaign-road"
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
      >
        <path className="progress-road" d={progress} />
      </svg>
      {nextMap && worldDone ? (
        <Link className="campaign-gate open" to={nextMap.path}>
          <ArrowRight size={18} />
          <span>
            {nextMap.nome}
            <small>{campaignT.enter}</small>
          </span>
        </Link>
      ) : (
        <div className="campaign-gate">
          <LockKeyhole size={18} />
          <span>
            {nextMap ? nextMap.nome : campaignT.newWorlds}
            <small>
              {nextMap
                ? campaignT.remaining(remaining, worldStars, list.length * 3)
                : campaignT.soon}
            </small>
          </span>
        </div>
      )}
      <ol className="campaign-levels">
        {list.map((l, i) => {
          const unlocked = unlockedLevel(l);
          const state = p.stars[l.id]
            ? "complete"
            : unlocked
              ? "current"
              : "locked";
          const rival = rivalOf(l.number);
          const boss = !!rival?.boss;
          return (
            <li
              key={l.id}
              className={`map-stop ${state} ${boss ? "boss" : ""}`}
              style={{ left: onRoad(stopY(i)), top: stopY(i) }}
            >
              <Link
                aria-disabled={!unlocked}
                aria-label={campaignT.level(
                  l.number,
                  boss ? rival?.name : undefined,
                  p.stars[l.id] ?? 0,
                  unlocked,
                )}
                onClick={(e) => !unlocked && e.preventDefault()}
                className={`level-node ${state}`}
                to={`/play/${l.id}`}
              >
                {unlocked ? l.number : <LockKeyhole />}
                {boss && (
                  <Crown className="boss-crown" size={18} aria-hidden="true" />
                )}
              </Link>
              <strong className="stop-tag">
                {state === "complete"
                  ? "★".repeat(p.stars[l.id])
                  : state === "current"
                    ? boss
                      ? campaignT.bossTag(rival?.name)
                      : campaignT.here
                    : boss
                      ? campaignT.boss
                      : campaignT.locked}
              </strong>
            </li>
          );
        })}
      </ol>
      {prevMap ? (
        <Link className="campaign-start" to={prevMap.path}>
          <Flag size={16} /> {prevMap.nome}
        </Link>
      ) : (
        <div className="campaign-start">
          <Flag size={16} /> {map.start}
        </div>
      )}
    </section>
  );
}
const THEME_ICONS: Record<string, typeof Shapes> = {
  animais: PawPrint,
  comida: Utensils,
  natureza: Trees,
  casa: Armchair,
  animes: Swords,
  esportes: Trophy,
  profissoes: BriefcaseBusiness,
  corpo: HeartPulse,
  escola: Backpack,
};
/** Modo casual: escolha um tema e jogue um duelo numa grade com palavras dele. */
export function Casual() {
  const p = usePlayer((s) => s.player);
  const navigate = useNavigate();
  // As partidas do casual têm oponente sorteado (nível variável): vale qualquer sessão da grade.
  const keysOf = (id: string) =>
    Object.keys(p.sessions).filter((k) => k.startsWith(`vs:${id}:`));
  const done = (id: string) => keysOf(id).some((k) => p.sessions[k].claimed);
  // "Jogar" abre a configuração da partida (tamanho do tabuleiro e tempo por jogada).
  const play = (theme: CasualTheme) =>
    navigate(`/casual/nova?tema=${theme.id}`);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{casualT.eyebrow}</span>
        <h1>{casualT.title}</h1>
        <p>{casualT.sub}</p>
      </div>
      <Deck
        className="theme-deck"
        label={casualT.themes}
        items={casualThemes}
        keyOf={(t) => t.id}
        cardProps={(t) => ({
          className: "theme-card",
          "data-theme": t.id,
          style: themeColors(t),
        })}
        render={(t) => {
          const Icon = THEME_ICONS[t.id] ?? Shapes;
          const finished = t.puzzles.filter((g) => done(g.id)).length;
          return (
            <>
              <AssetImage
                className="theme-art"
                src={themeArt(t)}
                alt=""
                width={512}
                height={512}
                draggable={false}
              />
              <span className="theme-icon" aria-hidden="true">
                <Icon size={30} />
              </span>
              <strong>{t.nome}</strong>
              <small>{casualT.won(finished, t.puzzles.length)}</small>
              <span
                className="theme-progress"
                role="progressbar"
                aria-label={casualT.progress(t.nome)}
                aria-valuenow={finished}
                aria-valuemin={0}
                aria-valuemax={t.puzzles.length}
              >
                <i
                  style={{ width: `${(finished / t.puzzles.length) * 100}%` }}
                />
              </span>
              <button
                type="button"
                className="button primary theme-play"
                aria-label={casualT.playTheme(t.nome)}
                onClick={() => play(t)}
              >
                {casualT.play}{" "}
                <Play size={18} fill="currentColor" aria-hidden="true" />
              </button>
            </>
          );
        }}
      />
      {onlineAvailable() && (
        <Link className="online-entry" to="/online">
          <Swords size={22} aria-hidden="true" />
          <b>{casualT.playFriend}</b>
        </Link>
      )}
    </>
  );
}
export function Daily() {
  const date = today();
  const [year, month, day] = date.split("-").map(Number);
  const p = usePlayer((s) => s.player);
  const days = new Date(year, month, 0).getDate();
  const offset = new Date(year, month - 1, 1).getDay();
  const iso = (n: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  // Sequência: dias seguidos vencidos até hoje (ou até ontem, se hoje ainda não foi vencido).
  const streak = currentStreak(p.daily, date);
  const shareResult = dailyResultText(p, date, streak);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{dailyT.eyebrow}</span>
        <h1>{dailyT.title}</h1>
        <p>{dailyT.sub}</p>
      </div>
      <p className="streak-pill">
        <Sparkles size={18} aria-hidden="true" />
        {streak > 1 ? dailyT.streak(streak) : dailyT.completed(p.daily.length)}
      </p>
      <section className="calendar-card">
        <div className="calendar-title">
          <CalendarDays />
          <h2>
            {new Intl.DateTimeFormat(locale(), {
              month: "long",
              year: "numeric",
            })
              .format(new Date(year, month - 1, day))
              .replace(/^./, (c) => c.toUpperCase())}
          </h2>
          {/* Só a vitória conta no diário (uma vez por dia): o selo diz a condição. */}
          <span className="pill">
            {p.daily.includes(date)
              ? dailyT.wonToday
              : dailyT.prize(economy.daily)}
          </span>
        </div>
        <div className="calendar">
          {dailyT.weekdays.map((d, i) => (
            <b key={i}>{d}</b>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const n = i + 1;
            const completed = p.daily.includes(iso(n));
            const missed = !completed && n < day;
            return (
              <span
                className={`${n === day ? "today" : ""} ${completed ? "done" : ""} ${n > day ? "future" : ""} ${missed ? "missed" : ""}`}
                key={n}
                role="img"
                aria-label={dailyT.day(
                  n,
                  completed
                    ? dailyT.dayDone
                    : n === day
                      ? dailyT.dayToday
                      : n > day
                        ? dailyT.dayFuture
                        : dailyT.dayMissed,
                )}
              >
                {completed ? <Check size={20} /> : n}
              </span>
            );
          })}
        </div>
        <ul className="calendar-legend" aria-hidden="true">
          <li>
            <Check size={14} /> {dailyT.legendWon}
          </li>
          <li>
            <i className="dot today" /> {dailyT.legendToday}
          </li>
          <li>
            <i className="dot missed" /> {dailyT.legendMissed}
          </li>
          <li>
            <i className="dot future" /> {dailyT.legendSoon}
          </li>
        </ul>
        {shareResult ? (
          <div className="daily-actions">
            <ShareResultButton text={shareResult} className="button primary" />
            <Link className="button result-ghost" to="/play/daily">
              {dailyT.revisit} <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <Link className="button primary" to="/play/daily">
            {p.daily.includes(date) ? dailyT.revisit : dailyT.playToday}{" "}
            <ArrowRight size={18} />
          </Link>
        )}
      </section>
    </>
  );
}
/** Texto para compartilhar o desafio de hoje, se ele já terminou (vencido ou não). */
function dailyResultText(p: Player, date: string, streak: number) {
  const puzzle = dailyPuzzle(date);
  const rival = opponentFor({
    puzzleId: puzzle.id,
    number: puzzle.number,
    mode: "daily",
    date,
  });
  const session = p.sessions[`daily:${date}:${rival.level}`];
  if (!session || !new PuzzleEngine(puzzle).complete(session)) return undefined;
  return dailyShareText({
    date,
    session,
    rival: rival.name,
    streak,
  });
}
type ProfileTab = "resumo" | "conquistas" | "rivais" | "ajustes";
const PROFILE_TABS: ProfileTab[] = [
  "resumo",
  "conquistas",
  "rivais",
  "ajustes",
];
/**
 * Perfil: quem é o jogador no topo (avatar, nome e um resumo de uma linha) e o resto em abas, uma
 * seção por vez. O avatar e o nome são editados numa janela própria, aberta pelo botão do avatar.
 */
export function Profile() {
  const p = usePlayer((s) => s.player);
  const [tab, setTab] = useState<ProfileTab>("resumo");
  const [editing, setEditing] = useState(false);
  const ready = claimableCount(p);
  const stars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  return (
    <>
      <section className="profile-header" aria-label={profileT.you}>
        <button
          type="button"
          className="profile-avatar"
          aria-label={profileT.editAvatar}
          onClick={() => setEditing(true)}
        >
          <FramedAvatar
            opponent={avatarOf(p.avatar)}
            size={84}
            frame={currentFrame(p)}
          />
          <span className="profile-avatar-edit" aria-hidden="true">
            <Pencil size={15} />
          </span>
        </button>
        <div className="profile-who">
          <span className="eyebrow">{profileT.eyebrow}</span>
          <h1>{p.name.trim() || profileT.defaultName}</h1>
          <p>
            {profileT.summary(
              Object.keys(p.stars).length,
              levels.length,
              stars,
              p.coins,
            )}
          </p>
        </div>
      </section>
      <div
        className="profile-tabs"
        role="tablist"
        aria-label={profileT.tabList}
      >
        {PROFILE_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`profile-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="profile-panel"
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            {profileT.tabs[id]}
            {id === "conquistas" && ready > 0 && (
              <span className="tab-badge" aria-label={profileT.ready(ready)}>
                {ready}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="profile-panel"
        role="tabpanel"
        id="profile-panel"
        aria-label={profileT.tabPanel(profileT.tabs[tab])}
      >
        {tab === "resumo" && (
          <>
            <PlayGamesCard />
            <ProfileStats />
          </>
        )}
        {tab === "conquistas" && <Achievements />}
        {tab === "rivais" && <ProfileRivals />}
        {tab === "ajustes" && <ProfileSettings />}
      </div>
      {editing && <EditProfileDialog onClose={() => setEditing(false)} />}
    </>
  );
}
/** Janela de edição do jogador: avatar e nome. As escolhas valem na hora. */
function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const { player: p, update } = usePlayer();
  return (
    <div
      className="swap-backdrop"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="swap-dialog profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={profileT.editTitle}
      >
        <h2>{profileT.editTitle}</h2>
        <span className="profile-dialog-label">{profileT.yourAvatar}</span>
        <ul className="avatar-picker" aria-label={profileT.avatars}>
          {pickableAvatars(p).map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={a.id === p.avatar ? "selected" : ""}
                aria-pressed={a.id === avatarOf(p.avatar).id}
                aria-label={a.name}
                onClick={() => update((s) => ({ ...s, avatar: a.id }))}
              >
                <OpponentAvatar opponent={a} size={52} />
                <small>{a.name}</small>
              </button>
            </li>
          ))}
        </ul>
        <label className="profile-dialog-name">
          {profileT.nameLabel}
          <input
            value={p.name}
            maxLength={30}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          />
        </label>
        <div className="swap-actions">
          <button className="primary" autoFocus onClick={onClose}>
            {profileT.done}
          </button>
        </div>
      </div>
    </div>
  );
}
/** Aba Rivais: o elenco de personagens que o jogador enfrenta, um card por vez. */
function ProfileRivals() {
  return (
    <Deck
      className="rival-deck"
      label={profileT.rivals}
      items={OPPONENTS}
      keyOf={(o) => o.id}
      cardProps={(o) => ({ className: o.boss ? "rival boss" : "rival" })}
      render={(o) => (
        <>
          <span className="rival-portrait">
            <OpponentAvatar opponent={o} size={150} />
          </span>
          <strong>{o.name}</strong>
          <small className="rival-level">
            <Star size={14} fill="currentColor" aria-hidden="true" />
            {o.boss ? profileT.bossPrefix : ""}
            {OPPONENT_LEVELS[o.level].label} · {OPPONENT_STYLES[o.style].label}
          </small>
          <em>“{o.tagline}”</em>
        </>
      )}
    />
  );
}
/** Aba Ajustes: som, vibração, animações, contraste, relógio, tutorial e créditos. */
function ProfileSettings() {
  const { player: p, update } = usePlayer();
  return (
    <section className="profile-card" aria-label={profileT.settings}>
      <LanguageSetting />
      <label className="toggle">
        <span>
          <Volume2 />
          {profileT.sound}
        </span>
        <input
          type="checkbox"
          checked={p.sound}
          onChange={(e) =>
            update((s) => ({
              ...s,
              sound: e.target.checked,
              soundChosen: true,
            }))
          }
        />
      </label>
      <label className="toggle">
        <span>
          <Music />
          {profileT.music}
        </span>
        <input
          type="checkbox"
          checked={p.music}
          onChange={(e) => update((s) => ({ ...s, music: e.target.checked }))}
        />
      </label>
      <label className="toggle">
        <span>
          <Vibrate />
          {profileT.vibration}
        </span>
        <input
          type="checkbox"
          checked={p.vibration}
          onChange={(e) => {
            update((s) => ({ ...s, vibration: e.target.checked }));
            if (e.target.checked) buzz(true, "correct");
          }}
        />
      </label>
      <label className="toggle">
        <span>
          <Activity />
          {profileT.animations}
        </span>
        <input
          type="checkbox"
          checked={p.animations}
          onChange={(e) =>
            update((s) => ({ ...s, animations: e.target.checked }))
          }
        />
      </label>
      <label className="toggle">
        <span>
          <Contrast />
          {profileT.contrast}
        </span>
        <input
          type="checkbox"
          checked={p.highContrast}
          onChange={(e) =>
            update((s) => ({ ...s, highContrast: e.target.checked }))
          }
        />
      </label>
      {remindersSupported() && (
        <label className="toggle">
          <span>
            <BellRing />
            {profileT.reminder}
          </span>
          <input
            type="checkbox"
            checked={p.reminders === true}
            onChange={async (e) => {
              const on = e.target.checked;
              // Ligar pede a permissão do Android; sem ela, a opção volta a desligada.
              const granted = on ? await askReminderPermission() : false;
              update((s) => ({ ...s, reminders: on && granted }));
            }}
          />
        </label>
      )}
      <label className="toggle">
        <span>
          <Timer />
          {profileT.timer}
        </span>
        <input
          type="checkbox"
          checked={p.turnTimer}
          onChange={(e) =>
            update((s) => ({ ...s, turnTimer: e.target.checked }))
          }
        />
      </label>
      <div className="settings-actions">
        <button
          className="test-sound"
          disabled={!p.sound}
          onClick={() => playSfx(true, "correct", 3)}
        >
          <Volume2 size={18} /> {profileT.testSound}
        </button>
        <button
          className="test-sound"
          disabled={!p.tutorialDone}
          onClick={() =>
            // Rever o tutorial traz de volta a palavra guiada (confirmada ou pulada antes).
            update((s) => ({
              ...s,
              tutorialDone: false,
              tipsSeen: s.tipsSeen.filter((x) => x !== "palavra"),
            }))
          }
        >
          <Sparkles size={18} />{" "}
          {p.tutorialDone ? profileT.replayTutorial : profileT.tutorialOn}
        </button>
        {canRateInStore() && (
          <button
            className="test-sound rate-game"
            onClick={() => openStoreRating()}
          >
            <ThumbsUp size={18} /> {profileT.rate}
          </button>
        )}
      </div>
      <Link className="text-link credits-link" to="/credits">
        {profileT.credits}
      </Link>
      <AppVersion />
    </section>
  );
}
/** Nome de cada idioma escrito nele mesmo: quem não lê o idioma atual acha o seu. */
const LANG_NAMES: Record<Lang, string> = { pt: "Português", en: "English" };
/** Idioma do jogo: trocar grava a escolha e reabre o app na tela inicial. */
function LanguageSetting() {
  const current = lang();
  return (
    <div
      className="toggle language-setting"
      role="group"
      aria-labelledby="language-setting-label"
    >
      <span id="language-setting-label">
        <Languages />
        {profileT.language}
      </span>
      <div className="online-choices">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            lang={htmlLang(l)}
            aria-pressed={current === l}
            className={current === l ? "selected" : ""}
            onClick={() => changeLang(l)}
          >
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
/** Versão da loja e do pacote em uso (a atualização ao vivo troca só o pacote). */
function AppVersion() {
  const [text, setText] = useState("");
  useEffect(() => {
    let alive = true;
    void appVersion().then((v) => alive && setText(v));
    return () => {
      alive = false;
    };
  }, []);
  return text ? <small className="app-version">{text}</small> : null;
}
/** Resumo do progresso do jogador: fases, estrelas, duelos e desafios do dia. */
function ProfileStats() {
  const p = usePlayer((s) => s.player);
  const results = Object.values(p.duels);
  const wins = results.filter((r) => r === "win").length;
  const draws = results.filter((r) => r === "draw").length;
  const losses = results.filter((r) => r === "loss").length;
  const stars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const done = Object.keys(p.stars).length;
  // Progresso da jornada de um lado, resultado dos confrontos do outro.
  const groups: [string, [string, string][]][] = [
    [
      profileT.adventure,
      [
        [profileT.levels, `${done}/${levels.length}`],
        [profileT.stars, `${stars}/${levels.length * 3}`],
        [profileT.dailies, String(p.daily.length)],
      ],
    ],
    [
      profileT.duels,
      [
        [profileT.wins, String(wins)],
        [profileT.draws, String(draws)],
        [profileT.losses, String(losses)],
      ],
    ],
  ];
  return (
    <section className="profile-stats" aria-label={profileT.progress}>
      <h2>
        <Trophy size={20} aria-hidden="true" /> {profileT.progress}
      </h2>
      {groups.map(([title, items]) => (
        <div className="stats-group" key={title}>
          <h3>{title}</h3>
          <dl>
            {items.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
/** Conquistas, uma medalha por vez: as prontas para resgatar vêm primeiro; as já resgatadas, por último. */
function Achievements() {
  const p = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const rank = (a: AchievementStatus) => (a.claimed ? 2 : a.done ? 0 : 1);
  // Prontas primeiro; depois as em andamento, da mais perto da meta para a mais longe.
  const list = achievementStatus(p).sort(
    (a, b) => rank(a) - rank(b) || b.progress / b.goal - a.progress / a.goal,
  );
  const claimed = list.filter((a) => a.claimed).length;
  const ready = list.filter((a) => a.done && !a.claimed);
  const readyCoins = ready.reduce((n, a) => n + a.coins, 0);
  return (
    <>
      <div className="achievements-bar">
        <span>
          <Award size={18} aria-hidden="true" />{" "}
          {profileT.claimed(claimed, list.length)}
        </span>
        {ready.length > 1 && (
          <button
            type="button"
            className="achievement-claim claim-all"
            aria-label={profileT.claimAllLabel(readyCoins, ready.length)}
            onClick={() =>
              update((s) =>
                ready.reduce((n, a) => claimAchievement(n, a.id), s),
              )
            }
          >
            {profileT.claimAll} <CoinIcon size={16} /> +{readyCoins}
          </button>
        )}
      </div>
      <Deck
        className="medal-deck"
        label={profileT.achievements}
        items={list}
        keyOf={(a) => a.id}
        cardProps={(a) => ({
          className: `medal ${a.done ? "earned" : ""} ${a.claimed ? "claimed" : ""}`,
        })}
        render={(a) => (
          <>
            <img
              className="medal-art"
              src={`/art/conquistas/${a.id}.webp`}
              alt=""
              width={132}
              height={132}
              draggable={false}
            />
            <strong>{a.title}</strong>
            <p>{a.text}</p>
            {!a.done && (
              <span className="achievement-progress">
                <span
                  className="bar"
                  role="progressbar"
                  aria-label={profileT.achievementProgress(a.title)}
                  aria-valuenow={a.progress}
                  aria-valuemin={0}
                  aria-valuemax={a.goal}
                >
                  <i style={{ width: `${(a.progress / a.goal) * 100}%` }} />
                </span>
                <small>
                  {a.progress}/{a.goal}
                </small>
              </span>
            )}
            {a.claimed ? (
              <span className="achievement-prize">{profileT.claimedOne}</span>
            ) : a.done ? (
              <button
                type="button"
                className="achievement-claim"
                aria-label={profileT.claimLabel(a.coins, a.title)}
                onClick={() => update((s) => claimAchievement(s, a.id))}
              >
                {profileT.claim} <CoinIcon size={16} /> +{a.coins}
              </button>
            ) : (
              <span
                className="achievement-prize"
                aria-label={profileT.prizeLabel(a.coins)}
              >
                <CoinIcon size={16} /> {profileT.coins(a.coins)}
              </span>
            )}
          </>
        )}
      />
    </>
  );
}
