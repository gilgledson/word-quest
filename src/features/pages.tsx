import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  LockKeyhole,
  Star,
  Flag,
  Compass,
  Volume2,
  Activity,
  Check,
  PawPrint,
  Utensils,
  Trees,
  Armchair,
  Shapes,
  Music,
  Vibrate,
} from "lucide-react";
import { Scenery } from "../components/Scenery";
import road from "../data/map-road.json";
import { usePlayer } from "../stores/player";
import {
  levels,
  today,
  maps,
  mapOf,
  worldLevels,
  casualThemes,
  type CasualTheme,
} from "../data/catalog";
import { OPPONENT_LEVELS, OPPONENT_STYLES } from "../game/opponent";
import { OPPONENTS, randomOpponent } from "../game/opponents";
import { avatarOf, PLAYER_AVATARS } from "../game/avatars";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { playSfx } from "../services/sound";
import { buzz } from "../services/haptics";
export function Home() {
  const p = usePlayer((s) => s.player);
  const next = levels.find((l) => !p.stars[l.id]) ?? levels[0];
  return (
    <>
      <section className="welcome">
        <span className="eyebrow">SEU PRÓXIMO CAPÍTULO COMEÇA AQUI</span>
        <h1>
          Um mundo inteiro
          <br />
          entre as <em>palavras.</em>
        </h1>
        <p>Desvende pistas. Descubra caminhos. Viva a aventura.</p>
      </section>
      <section className="adventure-card">
        <div className="world-preview" aria-hidden="true">
          <Scenery />
        </div>
        <div className="scene-label">
          <span className="pill">MUNDO 01</span>
          <h2>Vila das Palavras</h2>
          <p>Grandes jornadas começam com pequenas descobertas.</p>
        </div>
        <div className="adventure-action">
          <div>
            <span className="eyebrow">SUA JORNADA</span>
            <strong>
              Fase {next.number} <span>· {next.difficulty}</span>
            </strong>
          </div>
        </div>
        <div
          className="journey-progress"
          role="progressbar"
          aria-label="Fases concluídas"
          aria-valuenow={Object.keys(p.stars).length}
          aria-valuemin={0}
          aria-valuemax={levels.length}
        >
          <span
            style={{
              width: `${(Object.keys(p.stars).length / levels.length) * 100}%`,
            }}
          />
          <strong>
            {Object.keys(p.stars).length} / {levels.length}
          </strong>
          <span className="game-art art-chest" aria-hidden="true" />
        </div>
      </section>
      <Link className="button primary continue-button" to={`/play/${next.id}`}>
        Continuar aventura <ArrowRight size={24} />
      </Link>
      <div className="home-grid">
        <Link to="/daily" className="daily-card">
          <span className="game-art art-calendar" aria-hidden="true" />
          <span className="eyebrow">UM NOVO ENIGMA A CADA DIA</span>
          <h2>Desafio do Dia</h2>
          <p>
            Uma pausa para a mente.
            <br />
            Uma recompensa para a jornada.
          </p>
          <span className="text-link">
            {p.daily.includes(today()) ? "Concluído hoje" : "Aceitar desafio"}{" "}
            <ArrowRight size={17} />
          </span>
          <span className="reward-tag">
            <Sparkles size={15} /> +70 moedas
          </span>
        </Link>
        <Link to={mapOf(next.world).path} className="map-card">
          <span className="game-art art-map" aria-hidden="true" />
          <span className="eyebrow">CADA PASSO CONTA</span>
          <h2>Explore o mapa</h2>
          <p>
            {Object.keys(p.stars).length} de {levels.length} fases concluídas.
            <br />
            Seu próximo destino espera.
          </p>
          <span className="text-link">
            Ver minha jornada <ArrowRight size={17} />
          </span>
          <div className="mini-path">
            ● ┄┄ ● ┄┄ <Flag size={24} />
          </div>
        </Link>
      </div>
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
      <img
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
            <small>{nextMap ? "Vença este mundo" : "Em breve"}</small>
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
          return (
            <li
              key={l.id}
              className={`map-stop ${state}`}
              style={{ left: onRoad(stopY(i)), top: stopY(i) }}
            >
              <Link
                aria-disabled={!unlocked}
                aria-label={`Fase ${l.number}${p.stars[l.id] ? `, ${p.stars[l.id]} estrelas` : unlocked ? ", disponível" : ", bloqueada"}`}
                onClick={(e) => !unlocked && e.preventDefault()}
                className={`level-node ${state}`}
                to={`/play/${l.id}`}
              >
                {unlocked ? l.number : <LockKeyhole />}
              </Link>
              <strong className="stop-tag">
                {state === "complete"
                  ? "★".repeat(p.stars[l.id])
                  : state === "current"
                    ? "Você está aqui"
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
  const update = usePlayer((s) => s.update);
  const navigate = useNavigate();
  // As partidas do casual têm oponente sorteado (nível variável): vale qualquer sessão da grade.
  const keysOf = (id: string) =>
    Object.keys(p.sessions).filter((k) => k.startsWith(`vs:${id}:`));
  const done = (id: string) => keysOf(id).some((k) => p.sessions[k].claimed);
  const play = (theme: CasualTheme) => {
    const open = theme.puzzles.filter((g) => !done(g.id));
    const pool = open.length ? open : theme.puzzles;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // Grade já jogada até o fim: recomeça do zero (a recompensa só vale na primeira vez).
    if (!open.length)
      update((q) => {
        const sessions = { ...q.sessions };
        for (const k of keysOf(pick.id)) delete sessions[k];
        return { ...q, sessions };
      });
    navigate(`/play/${pick.id}?vs=${randomOpponent().id}`);
  };
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MODO CASUAL</span>
        <h1>Escolha um tema</h1>
        <p>Um duelo rápido numa cruzadinha cheia de palavras do tema.</p>
      </div>
      <div className="theme-grid">
        {casualThemes.map((t) => {
          const Icon = THEME_ICONS[t.id] ?? Shapes;
          const finished = t.puzzles.filter((g) => done(g.id)).length;
          return (
            <button
              key={t.id}
              className="theme-card"
              onClick={() => play(t)}
              aria-label={`Tema ${t.nome}`}
            >
              <Icon size={34} />
              <strong>{t.nome}</strong>
              <small>
                {finished} de {t.puzzles.length} grades vencidas
              </small>
            </button>
          );
        })}
      </div>
    </>
  );
}
export function Daily() {
  const date = today();
  const [year, month, day] = date.split("-").map(Number);
  const p = usePlayer((s) => s.player);
  const days = new Date(year, month, 0).getDate();
  const offset = new Date(year, month - 1, 1).getDay();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">UM PEQUENO RITUAL DE DESCOBERTAS</span>
        <h1>Desafio do Dia</h1>
        <p>Volte a cada dia para um novo caminho.</p>
      </div>
      <section className="calendar-card">
        <div className="calendar-title">
          <CalendarDays />
          <h2>
            {new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            }).format(new Date(year, month - 1, day))}
          </h2>
          <span className="pill">+70 moedas</span>
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
            const completed = p.daily.includes(
              `${year}-${String(month).padStart(2, "0")}-${String(n).padStart(2, "0")}`,
            );
            return (
              <span
                className={`${n === day ? "today" : ""} ${completed ? "done" : ""}`}
                key={n}
              >
                {completed ? <Check size={20} /> : n}
              </span>
            );
          })}
        </div>
        <Link className="button primary" to="/play/daily">
          {p.daily.includes(date)
            ? "Revisitar desafio"
            : "Jogar o desafio de hoje"}{" "}
          <ArrowRight size={18} />
        </Link>
        <p className="caption">
          Horário de Brasília · Progresso salvo neste dispositivo
        </p>
      </section>
      <div className="notice">
        <Sparkles />
        <p>
          {p.daily.length} desafios concluídos. O catálogo inicial alterna entre
          as três cruzadinhas da primeira expedição.
        </p>
      </div>
    </>
  );
}
export function Profile() {
  const { player: p, update } = usePlayer();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">CADA EXPLORADOR TEM UMA HISTÓRIA</span>
        <h1>Seu perfil</h1>
      </div>
      <section className="profile-card">
        <div className="avatar">
          <OpponentAvatar opponent={avatarOf(p.avatar)} size={76} />
        </div>
        <div className="opponent-setting">
          <span>Seu avatar</span>
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
        </div>
        <label>
          Nome do explorador
          <input
            value={p.name}
            maxLength={30}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          />
        </label>
        <div className="opponent-setting">
          <span>Seus rivais</span>
          <p className="rivals-note">
            Cada fase tem seu oponente; o último de cada mundo é o chefe.
          </p>
          <ul className="opponent-picker" aria-label="Rivais">
            {OPPONENTS.map((o) => (
              <li key={o.id}>
                <OpponentAvatar opponent={o} size={56} />
                <strong>{o.name}</strong>
                <small>
                  {o.boss ? "Chefe · " : ""}
                  {OPPONENT_LEVELS[o.level].label} ·{" "}
                  {OPPONENT_STYLES[o.style].label}
                </small>
                <em>{o.tagline}</em>
              </li>
            ))}
          </ul>
        </div>
        <div className="stats">
          <div>
            <strong>{Object.keys(p.stars).length}</strong>
            <span>Fases</span>
          </div>
          <div>
            <strong>{Object.values(p.stars).reduce((a, b) => a + b, 0)}</strong>
            <span>Estrelas</span>
          </div>
          <div>
            <strong>{p.daily.length}</strong>
            <span>Desafios</span>
          </div>
        </div>
        <h2>Suas descobertas</h2>
        <div
          className={`achievement ${Object.keys(p.stars).length ? "earned" : ""}`}
        >
          <Star />
          <div>
            <strong>O primeiro passo</strong>
            <p>
              {Object.keys(p.stars).length
                ? "Conquista desbloqueada!"
                : "Complete sua primeira fase."}
            </p>
          </div>
        </div>
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
        <button
          className="test-sound"
          disabled={!p.sound}
          onClick={() => playSfx(true, "correct", 3)}
        >
          <Volume2 size={18} /> Testar som
        </button>
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
        <button
          className="test-sound"
          disabled={!p.tutorialDone}
          onClick={() => update((s) => ({ ...s, tutorialDone: false }))}
        >
          <Sparkles size={18} />{" "}
          {p.tutorialDone ? "Rever o tutorial" : "Tutorial ativo na Fase 1"}
        </button>
        <p className="caption">
          Seu progresso fica neste navegador. Não é necessário criar uma conta.
        </p>
      </section>
    </>
  );
}
