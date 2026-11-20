import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  LockKeyhole,
  Flag,
  Compass,
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
} from "lucide-react";
import { Scenery } from "../components/Scenery";
import { wordsFoundCount } from "../game/chest";
import {
  achievementStatus,
  claimAchievement,
  claimableCount,
  type AchievementStatus,
} from "../game/achievements";
import { CoinIcon } from "../components/CoinIcon";
import { ChestHint, HomeChest } from "./HomeChest";
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
import { avatarOf, PLAYER_AVATARS } from "../game/avatars";
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
import { onlineAvailable } from "../services/online";
import { appVersion } from "../services/liveUpdate";
export function Home() {
  const p = usePlayer((s) => s.player);
  const next = levels.find((l) => !p.stars[l.id]) ?? levels[0];
  const wins = Object.keys(p.stars).length;
  const words = wordsFoundCount(p.wordsFound);
  const world = mapOf(next.world);
  // Partida da próxima fase já começada (há letras confirmadas) e ainda sem resultado.
  const started = Object.entries(p.sessions).some(
    ([key, s]) =>
      key.startsWith(`vs:${next.id}:`) && !s.claimed && s.locked?.length > 0,
  );
  // O botão diz o que o toque faz: quem nunca jogou não tem o que "continuar".
  const action = started
    ? "Retomar partida"
    : wins === 0
      ? "Jogar primeira fase"
      : "Continuar aventura";
  return (
    <>
      <section className="welcome">
        <h1>
          <Sparkles aria-hidden="true" />
          {wins ? "Sua aventura continua!" : "Sua aventura começa!"}
          <Sparkles aria-hidden="true" />
        </h1>
      </section>
      {onlineAvailable() && <DuelCard avatar={p.avatar} />}
      <section className="adventure-card">
        <Link
          className="adventure-link"
          to={world.path}
          aria-label={`Ver o mapa: ${world.nome}`}
        >
          <div className="world-preview" aria-hidden="true">
            <Scenery />
          </div>
          <div className="scene-label">
            <span className="pill">
              MUNDO {String(maps.indexOf(world) + 1).padStart(2, "0")}
            </span>
            <h2>{world.nome}</h2>
            <p>Grandes jornadas começam com pequenas descobertas.</p>
          </div>
        </Link>
        <div className="adventure-action">
          <div>
            <ChestHint words={words} />
            <strong>
              Fase {next.number} <span>· {next.difficulty}</span>
            </strong>
          </div>
        </div>
        <div className="journey">
          <div
            className="journey-progress"
            role="progressbar"
            aria-label="Fases concluídas"
            aria-valuenow={wins}
            aria-valuemin={0}
            aria-valuemax={levels.length}
          >
            <span style={{ width: `${(wins / levels.length) * 100}%` }} />
            <strong>
              {wins} de {levels.length} fases
            </strong>
          </div>
          <HomeChest words={words} />
        </div>
      </section>
      <Link
        className="shop-card"
        to="/loja"
        aria-label="Loja de itens: Curinga e Kit de vogais"
      >
        <span className="shop-card-art" aria-hidden="true">
          <img src="/art/loja/moedas.webp" alt="" draggable={false} />
          <img src="/art/loja/vogais.webp" alt="" draggable={false} />
          <img src="/art/loja/curinga.webp" alt="" draggable={false} />
        </span>
        <span className="shop-card-text">
          <strong>Loja de itens</strong>
          <small>Curinga e Kit de vogais</small>
          <span className="shop-card-cta">
            Ver loja <ArrowRight size={16} aria-hidden="true" />
          </span>
        </span>
      </Link>
      <Link className="button primary continue-button" to={`/play/${next.id}`}>
        {action} <ArrowRight size={24} />
      </Link>
      <DailyRewardFlow />
      <div className="gentle-note">
        <Compass size={23} />
        <div>
          <strong>O caminho é seu. O ritmo também.</strong>
          <p>Sem cronômetro. Sem pressa. Só mais uma descoberta.</p>
        </div>
      </div>
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
            <small>Entrar</small>
          </span>
        </Link>
      ) : (
        <div className="campaign-gate">
          <LockKeyhole size={18} />
          <span>
            {nextMap ? nextMap.nome : "Novos mundos"}
            <small>
              {nextMap
                ? `Faltam ${remaining} ${remaining === 1 ? "fase" : "fases"} · ★ ${worldStars}/${list.length * 3}`
                : "Em breve"}
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
                aria-label={`Fase ${l.number}${boss ? `, chefe ${rival?.name}` : ""}${p.stars[l.id] ? `, ${p.stars[l.id]} estrelas` : unlocked ? ", disponível" : ", bloqueada"}`}
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
                      ? `Chefe: ${rival?.name}`
                      : "Você está aqui"
                    : boss
                      ? "Chefe"
                      : "Bloqueada"}
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
        <span className="eyebrow">MODO CASUAL</span>
        <h1>Escolha um tema</h1>
        <p>Um duelo rápido numa cruzadinha cheia de palavras do tema.</p>
      </div>
      <Deck
        className="theme-deck"
        label="Temas"
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
              <small>
                {finished} de {t.puzzles.length} grades vencidas
              </small>
              <span
                className="theme-progress"
                role="progressbar"
                aria-label={`Progresso em ${t.nome}`}
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
                aria-label={`Jogar tema ${t.nome}`}
                onClick={() => play(t)}
              >
                Jogar <Play size={18} fill="currentColor" aria-hidden="true" />
              </button>
            </>
          );
        }}
      />
      {onlineAvailable() && (
        <Link className="online-entry" to="/online">
          <Swords size={22} aria-hidden="true" />
          <b>Jogar com um amigo</b>
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
        <span className="eyebrow">UM PEQUENO RITUAL DE DESCOBERTAS</span>
        <h1>Desafio do Dia</h1>
        <p>Volte a cada dia para um novo caminho.</p>
      </div>
      <p className="streak-pill">
        <Sparkles size={18} aria-hidden="true" />
        {streak > 1
          ? `${streak} dias seguidos`
          : `${p.daily.length} ${p.daily.length === 1 ? "desafio concluído" : "desafios concluídos"}`}
      </p>
      <section className="calendar-card">
        <div className="calendar-title">
          <CalendarDays />
          <h2>
            {new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            })
              .format(new Date(year, month - 1, day))
              .replace(/^./, (c) => c.toUpperCase())}
          </h2>
          {/* Só a vitória conta no diário (uma vez por dia): o selo diz a condição. */}
          <span className="pill">
            {p.daily.includes(date)
              ? "Vencido hoje ✓"
              : `+${economy.daily} ao vencer`}
          </span>
        </div>
        <div className="calendar">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
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
                aria-label={`Dia ${n}: ${completed ? "concluído" : n === day ? "disponível hoje" : n > day ? "ainda indisponível" : "não vencido"}`}
              >
                {completed ? <Check size={20} /> : n}
              </span>
            );
          })}
        </div>
        <ul className="calendar-legend" aria-hidden="true">
          <li>
            <Check size={14} /> vencido
          </li>
          <li>
            <i className="dot today" /> hoje
          </li>
          <li>
            <i className="dot missed" /> não vencido
          </li>
          <li>
            <i className="dot future" /> em breve
          </li>
        </ul>
        {shareResult ? (
          <div className="daily-actions">
            <ShareResultButton text={shareResult} className="button primary" />
            <Link className="button result-ghost" to="/play/daily">
              Revisitar desafio <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <Link className="button primary" to="/play/daily">
            {p.daily.includes(date)
              ? "Revisitar desafio"
              : "Jogar o desafio de hoje"}{" "}
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
const PROFILE_TABS: [ProfileTab, string][] = [
  ["resumo", "Resumo"],
  ["conquistas", "Conquistas"],
  ["rivais", "Rivais"],
  ["ajustes", "Ajustes"],
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
      <section className="profile-header" aria-label="Você">
        <button
          type="button"
          className="profile-avatar"
          aria-label="Editar avatar e nome"
          onClick={() => setEditing(true)}
        >
          <OpponentAvatar opponent={avatarOf(p.avatar)} size={84} />
          <span className="profile-avatar-edit" aria-hidden="true">
            <Pencil size={15} />
          </span>
        </button>
        <div className="profile-who">
          <span className="eyebrow">SEU PERFIL</span>
          <h1>{p.name.trim() || "Explorador"}</h1>
          <p>
            {Object.keys(p.stars).length} de {levels.length} fases · {stars}{" "}
            estrelas · {p.coins} moedas
          </p>
        </div>
      </section>
      <div
        className="profile-tabs"
        role="tablist"
        aria-label="Seções do perfil"
      >
        {PROFILE_TABS.map(([id, label]) => (
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
            {label}
            {id === "conquistas" && ready > 0 && (
              <span className="tab-badge" aria-label={`${ready} prontas`}>
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
        aria-label={`Aba ${PROFILE_TABS.find(([id]) => id === tab)?.[1]}`}
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
        aria-label="Editar perfil"
      >
        <h2>Editar perfil</h2>
        <span className="profile-dialog-label">Seu avatar</span>
        <ul className="avatar-picker" aria-label="Avatares">
          {PLAYER_AVATARS.map((a) => (
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
          Nome do explorador
          <input
            value={p.name}
            maxLength={30}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          />
        </label>
        <div className="swap-actions">
          <button className="primary" autoFocus onClick={onClose}>
            Concluir
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
      label="Rivais"
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
            {o.boss ? "Chefe · " : ""}
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
    <section className="profile-card" aria-label="Ajustes">
      <label className="toggle">
        <span>
          <Volume2 />
          Efeitos sonoros
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
          Música
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
          Vibração
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
          Animações
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
          Alto contraste na grade
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
            Lembrete diário (18h30)
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
          Relógio do turno (25 s)
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
          <Volume2 size={18} /> Testar som
        </button>
        <button
          className="test-sound"
          disabled={!p.tutorialDone}
          onClick={() => update((s) => ({ ...s, tutorialDone: false }))}
        >
          <Sparkles size={18} />{" "}
          {p.tutorialDone ? "Rever o tutorial" : "Tutorial ativo"}
        </button>
      </div>
      <Link className="text-link credits-link" to="/credits">
        Créditos e licenças
      </Link>
      <AppVersion />
    </section>
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
      "Aventura",
      [
        ["Fases", `${done}/${levels.length}`],
        ["Estrelas", `${stars}/${levels.length * 3}`],
        ["Desafios do dia", String(p.daily.length)],
      ],
    ],
    [
      "Duelos",
      [
        ["Vitórias", String(wins)],
        ["Empates", String(draws)],
        ["Derrotas", String(losses)],
      ],
    ],
  ];
  return (
    <section className="profile-stats" aria-label="Seu progresso">
      <h2>
        <Trophy size={20} aria-hidden="true" /> Seu progresso
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
          <Award size={18} aria-hidden="true" /> {claimed}/{list.length}{" "}
          resgatadas
        </span>
        {ready.length > 1 && (
          <button
            type="button"
            className="achievement-claim claim-all"
            aria-label={`Resgatar tudo: ${readyCoins} moedas de ${ready.length} conquistas`}
            onClick={() =>
              update((s) =>
                ready.reduce((n, a) => claimAchievement(n, a.id), s),
              )
            }
          >
            Resgatar tudo <CoinIcon size={16} /> +{readyCoins}
          </button>
        )}
      </div>
      <Deck
        className="medal-deck"
        label="Conquistas"
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
                  aria-label={`Progresso de ${a.title}`}
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
              <span className="achievement-prize">Resgatada ✓</span>
            ) : a.done ? (
              <button
                type="button"
                className="achievement-claim"
                aria-label={`Resgatar ${a.coins} moedas de ${a.title}`}
                onClick={() => update((s) => claimAchievement(s, a.id))}
              >
                Resgatar <CoinIcon size={16} /> +{a.coins}
              </button>
            ) : (
              <span
                className="achievement-prize"
                aria-label={`Prêmio: ${a.coins} moedas`}
              >
                <CoinIcon size={16} /> {a.coins} moedas
              </span>
            )}
          </>
        )}
      />
    </>
  );
}
