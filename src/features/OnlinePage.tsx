import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Dices,
  MailOpen,
  Share2,
  Swords,
  Users,
  X,
} from "lucide-react";
import { themeArt, today } from "../data/catalog";
import { AssetImage } from "../components/AssetImage";
import { PuzzleEngine, economy, type Session } from "../game/crossword-engine";
import {
  CODE_LENGTH,
  onlineThemes,
  SURPRISE_THEME,
  cleanCode,
  inviteText,
  newCode,
  roomPuzzle,
  pickOnlinePuzzle,
  rivalProfile,
  rivalSeat,
  roleOf,
  sessionKeyOf,
  startOnline,
  toShared,
  themeOfPuzzle,
  toView,
  type OnlineRoom,
  type OnlineSeat,
} from "../game/online";
import {
  onlineAvailable,
  onlineBackend,
  type OnlineBackend,
} from "../services/online";
import { usePlayer } from "../stores/player";
import { Duel } from "./PuzzlePage";
import { copyText, shareText } from "../services/share";
import { track } from "../services/telemetry";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { avatarOf } from "../game/avatars";

/** Depois de quanto tempo sem conexão do amigo o jogador pode encerrar a partida. */
export const RIVAL_OFFLINE_MS = 30_000;
const UNAVAILABLE =
  "Não foi possível falar com o servidor. Confira a internet e tente de novo.";

const seatOf = (uid: string, name: string, avatar: string): OnlineSeat => ({
  uid,
  name: name.trim() || "Jogador",
  avatar,
});

/** Tela de entrada do duelo ao vivo: criar uma partida ou entrar com o código do amigo. */
export function OnlineLobby() {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"criar" | "entrar">("criar");
  const [theme, setTheme] = useState(SURPRISE_THEME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!onlineAvailable())
    return (
      <div className="page-heading">
        <span className="eyebrow">DUELO AO VIVO</span>
        <h1>Jogar com um amigo</h1>
        <p>O duelo ao vivo ainda não está disponível nesta versão.</p>
        <Link to="/casual">Voltar</Link>
      </div>
    );
  const run = async (
    action: (b: OnlineBackend, uid: string) => Promise<void>,
  ) => {
    setBusy(true);
    setError("");
    try {
      const backend = await onlineBackend();
      await action(backend, await backend.uid());
    } catch {
      setError(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  };
  const create = () =>
    run(async (backend, uid) => {
      const puzzle = pickOnlinePuzzle(theme);
      // O código é sorteado; se já existir uma sala com ele, sorteia outro.
      for (let attempt = 0; attempt < 5; attempt++) {
        const fresh = newCode();
        const room: OnlineRoom = {
          code: fresh,
          puzzleId: puzzle.id,
          grid: puzzle,
          host: seatOf(uid, player.name, player.avatar),
          status: "waiting",
          rev: 0,
          state: startOnline(puzzle.id, `${fresh}:${Date.now()}`, puzzle),
        };
        if (!(await backend.create(room))) continue;
        // Uma partida antiga com o mesmo código não pode ser retomada por engano.
        update((p) => {
          const sessions = { ...p.sessions };
          delete sessions[sessionKeyOf(fresh)];
          return { ...p, sessions };
        });
        track("online_room_created", {
          theme: themeOfPuzzle(puzzle.id)?.id ?? "aventura",
          theme_choice: theme,
        });
        navigate(`/online/${fresh}`);
        return;
      }
      setError(UNAVAILABLE);
    });
  const join = () =>
    run(async (backend, uid) => {
      const result = await backend.join(
        code,
        seatOf(uid, player.name, player.avatar),
      );
      if (result.ok) {
        track("online_room_joined");
        navigate(`/online/${code}`);
      } else
        setError(
          result.reason === "missing"
            ? "Não achei nenhuma partida com esse código."
            : result.reason === "full"
              ? "Essa partida já tem dois jogadores."
              : "Essa partida já terminou.",
        );
    });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">DUELO AO VIVO</span>
        <h1>Jogar com um amigo</h1>
      </div>
      <div className="profile-tabs online-tabs" role="tablist">
        {(
          [
            ["criar", "Criar partida"],
            ["entrar", "Entrar com código"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            aria-controls="online-panel"
            className={mode === id ? "selected" : ""}
            onClick={() => {
              setMode(id);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        className="online-card"
        role="tabpanel"
        id="online-panel"
        aria-label={mode === "criar" ? "Criar partida" : "Entrar com código"}
      >
        {mode === "criar" ? (
          <>
            <h2 id="online-theme-title">Escolha o tema</h2>
            <div
              className="online-themes"
              role="radiogroup"
              aria-labelledby="online-theme-title"
            >
              {onlineThemes().map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.id}
                  className={theme === t.id ? "selected" : ""}
                  onClick={() => setTheme(t.id)}
                >
                  {t.id === SURPRISE_THEME ? (
                    <span className="online-theme-art surprise">
                      <Dices size={30} aria-hidden="true" />
                    </span>
                  ) : (
                    <AssetImage
                      className="online-theme-art"
                      src={themeArt(t)}
                      alt=""
                      width={96}
                      height={96}
                      draggable={false}
                    />
                  )}
                  {t.nome.split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="online-versus" aria-hidden="true">
              <span>
                <OpponentAvatar opponent={avatarOf(player.avatar)} size={60} />
                <b>{player.name.trim() || "Você"}</b>
              </span>
              <i>VS</i>
              <span>
                <em>?</em>
                <b>Seu amigo</b>
              </span>
            </div>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void create()}
            >
              <Swords size={20} aria-hidden="true" /> Criar partida
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === CODE_LENGTH) void join();
            }}
          >
            <span className="online-mail" aria-hidden="true">
              <MailOpen size={44} />
            </span>
            <label className="online-code-field">
              Código da partida
              <span className="online-code-boxes">
                <input
                  value={code}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoFocus
                  maxLength={CODE_LENGTH + 2}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                />
                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                  <i
                    key={i}
                    aria-hidden="true"
                    className={
                      i === Math.min(code.length, CODE_LENGTH - 1) ? "next" : ""
                    }
                  >
                    {code[i] ?? ""}
                  </i>
                ))}
              </span>
            </label>
            <p className="online-hint">
              Digite o código enviado pelo seu amigo.
            </p>
            <button
              type="submit"
              className="button primary"
              disabled={busy || code.length !== CODE_LENGTH}
            >
              <Users size={20} aria-hidden="true" /> Entrar
            </button>
          </form>
        )}
        <p className="online-error" role="alert">
          {error}
        </p>
      </section>
    </>
  );
}

type Loaded =
  | { kind: "loading" }
  | { kind: "error"; text: string }
  | { kind: "ready"; backend: OnlineBackend; uid: string };

/** A sala: espera o amigo, joga a partida e mostra o fim (resultado ou abandono). */
export function OnlineMatch() {
  const code = cleanCode(useParams().code ?? "");
  const { player, update } = usePlayer();
  const [conn, setConn] = useState<Loaded>({ kind: "loading" });
  const [room, setRoom] = useState<OnlineRoom | null | undefined>(undefined);
  const [online, setOnline] = useState<string[]>([]);
  const [copied, setCopied] = useState("");
  const me = useRef(player);
  me.current = player;

  // Conecta, entra (ou volta) na sala e passa a acompanhá-la.
  useEffect(() => {
    let alive = true;
    let stop = () => {};
    void (async () => {
      try {
        const backend = await onlineBackend();
        const uid = await backend.uid();
        const joined = await backend.join(
          code,
          seatOf(uid, me.current.name, me.current.avatar),
        );
        if (!alive) return;
        if (!joined.ok) {
          setConn({
            kind: "error",
            text:
              joined.reason === "missing"
                ? "Não achei nenhuma partida com esse código."
                : joined.reason === "full"
                  ? "Essa partida já tem dois jogadores."
                  : "Essa partida já terminou.",
          });
          return;
        }
        setConn({ kind: "ready", backend, uid });
        const stopRoom = backend.watch(code, (r) => alive && setRoom(r));
        const stopPresence = backend.presence(
          code,
          uid,
          (uids) => alive && setOnline(uids),
        );
        stop = () => {
          stopRoom();
          stopPresence();
        };
      } catch {
        if (alive) setConn({ kind: "error", text: UNAVAILABLE });
      }
    })();
    return () => {
      alive = false;
      stop();
    };
  }, [code]);

  const uid = conn.kind === "ready" ? conn.uid : undefined;
  const backend = conn.kind === "ready" ? conn.backend : undefined;
  const role = room && uid ? roleOf(room, uid) : undefined;
  const puzzle = roomPuzzle(room);
  const engine = useMemo(
    () => (puzzle ? new PuzzleEngine(puzzle) : undefined),
    [puzzle],
  );
  const sessionKey = sessionKeyOf(code);
  const view = room && role ? toView(room.state, role) : undefined;
  const stored = player.sessions[sessionKey];
  const rival = room && role ? rivalSeat(room, role) : undefined;

  // O amigo sumiu? Depois de um tempo sem conexão, quem ficou pode encerrar a partida.
  const rivalOnline = !!rival && online.includes(rival.uid);
  const [rivalGone, setRivalGone] = useState(false);
  useEffect(() => {
    setRivalGone(false);
    if (rivalOnline || room?.status !== "playing") return;
    const t = window.setTimeout(() => setRivalGone(true), RIVAL_OFFLINE_MS);
    return () => window.clearTimeout(t);
  }, [rivalOnline, room?.status]);

  // Uma vez confirmada aqui que não chegou ao servidor (queda de rede) é enviada de novo.
  const send = (next: Session) => {
    if (!backend || !room || !role) return;
    void backend
      .play({
        ...room,
        rev: next.versus.rngCount,
        state: toShared(next, role),
        status: engine?.complete(next) ? "finished" : "playing",
      })
      .catch(() => {});
  };
  const pendingRev = stored?.versus.rngCount;
  useEffect(() => {
    if (!room || room.status !== "playing" || !stored) return;
    if (stored.versus.rngCount === room.rev + 1 && !stored.history.length)
      send(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRev, room?.rev, room?.status]);

  // O amigo abandonou: a vitória (e as moedas dela) fica com quem ficou, uma vez só.
  const wonByForfeit =
    room?.status === "abandoned" && !!uid && room.left !== uid;
  useEffect(() => {
    if (!wonByForfeit) return;
    update((p) =>
      sessionKey in p.duels
        ? p
        : {
            ...p,
            coins: p.coins + economy.duel.win,
            duels: { ...p.duels, [sessionKey]: "win" },
          },
    );
  }, [wonByForfeit, sessionKey, update]);

  const heading = (
    title: string,
    text: string,
    extra?: React.ReactNode,
    back = true,
  ) => (
    <div className="page-heading online-state">
      <span className="eyebrow">DUELO AO VIVO</span>
      <h1>{title}</h1>
      <p>{text}</p>
      {extra}
      {back && (
        <Link className="button online-ghost" to="/online">
          <ArrowLeft size={18} aria-hidden="true" /> Voltar
        </Link>
      )}
    </div>
  );
  if (conn.kind === "error") return heading("Não deu para entrar", conn.text);
  if (conn.kind === "loading" || room === undefined)
    return heading("Entrando na partida…", "Só um instante.");
  if (room === null)
    return heading(
      "Partida não encontrada",
      "Essa partida não existe mais. Crie outra e mande o código novo.",
    );
  if (!role || !uid || !backend || !puzzle || !engine || !view)
    return heading(
      "Não deu para entrar",
      "Essa partida já tem dois jogadores.",
    );

  if (room.status === "waiting") {
    const note = (ok: boolean, text: string) =>
      setCopied(ok ? text : "Não deu para copiar. Anote o código acima.");
    return heading(
      "Chame seu amigo",
      "Mande este código. A partida começa assim que ele entrar.",
      <>
        <output className="online-code" aria-label={`Código ${code}`}>
          {code}
        </output>
        <p className="online-theme-note">
          Tema: <b>{themeOfPuzzle(room.puzzleId)?.nome ?? "Surpresa"}</b>
        </p>
        <button
          type="button"
          className="button primary"
          onClick={() =>
            void shareText(inviteText(code)).then(
              (r) => r === "copied" && note(true, "Convite copiado!"),
            )
          }
        >
          <Share2 size={20} aria-hidden="true" /> Compartilhar convite
        </button>
        <button
          type="button"
          className="button online-ghost"
          onClick={() =>
            void copyText(code).then((ok) => note(ok, "Código copiado!"))
          }
        >
          <Copy size={18} aria-hidden="true" /> Copiar código
        </button>
        <p className="online-status" role="status">
          {copied}
        </p>
        <div className="online-actions">
          <Link className="button online-ghost" to="/online">
            <ArrowLeft size={18} aria-hidden="true" /> Voltar
          </Link>
          <button
            type="button"
            className="button online-danger"
            onClick={() => void backend.abandon(code, uid)}
          >
            <X size={18} aria-hidden="true" /> Cancelar
          </button>
        </div>
      </>,
      false,
    );
  }

  if (room.status === "abandoned")
    return wonByForfeit
      ? heading(
          "Vitória!",
          `${rivalProfile(rival).name} saiu da partida. Você ganhou ${economy.duel.win} moedas.`,
        )
      : heading("Partida encerrada", "Você saiu desta partida.");

  return (
    <>
      {room.status === "playing" && !rivalOnline && (
        <div className="online-banner" role="status">
          <span>{rivalProfile(rival).name} está sem conexão.</span>
          {rivalGone && (
            <button
              type="button"
              onClick={() => rival && void backend.abandon(code, rival.uid)}
            >
              Encerrar e ficar com a vitória
            </button>
          )}
        </div>
      )}
      <Duel
        setup={{
          daily: false,
          casual: true,
          date: today(),
          puzzle,
          backTo: "/online",
          theme: undefined,
          botLevel: "medio",
          engine,
          sessionKey,
          // A tela guarda as letras ainda não confirmadas; sem nada salvo, vale o servidor.
          session: stored?.puzzleId === puzzle.id ? stored : view,
        }}
        online={{
          rival: rivalProfile(rival),
          incoming: view,
          onTurn: send,
          notice:
            room.status === "playing" && !rivalOnline
              ? `${rivalProfile(rival).name} está sem conexão…`
              : undefined,
        }}
      />
    </>
  );
}
