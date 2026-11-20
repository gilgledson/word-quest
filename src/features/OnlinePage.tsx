import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Dices,
  MailOpen,
  Share2,
  Swords,
  Timer,
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
  inviteReward,
  isExpired,
  isLive,
  ROOM_EXPIRED,
  wonByForfeitOf,
  BET_OPTIONS,
  BOARD_SIZES,
  DEFAULT_BOARD,
  betPayout,
  sizeOf,
  themeSizes,
  type BoardSize,
  NO_RULES,
  TURN_OPTIONS,
  turnLabel,
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
import {
  avatarOf,
  needsProfile,
  NAME_MAX,
  NAME_MIN,
  PLAYER_AVATARS,
} from "../game/avatars";
import { CoinIcon } from "../components/CoinIcon";
import { BoardSizePicker } from "./BoardSizePicker";
import { Choices } from "./Choices";

/** Depois de quanto tempo sem conexão do amigo o jogador pode encerrar a partida. */
/** Quanto o amigo espera alguém sem conexão antes de poder encerrar (e ficar com a vitória). */
export const RIVAL_OFFLINE_MS = 120_000;
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
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"criar" | "entrar">("criar");
  const [theme, setTheme] = useState(SURPRISE_THEME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<OnlineRoom | null>(null);
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
  const enter = (backend: OnlineBackend, uid: string) =>
    backend
      .join(code, seatOf(uid, player.name, player.avatar))
      .then((result) => {
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
  // Sala com tempo ou aposta: o convidado vê as regras antes de entrar.
  const join = () =>
    run(async (backend, uid) => {
      const room = await backend.peek(code);
      const member = room && (room.host.uid === uid || room.guest?.uid === uid);
      const rules = room?.rules ?? NO_RULES;
      if (room && !member && (rules.bet || rules.turnSeconds)) {
        setPreview(room);
        return;
      }
      await enter(backend, uid);
    });
  const confirmJoin = () => run((backend, uid) => enter(backend, uid));
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
            <button
              type="button"
              className="button primary"
              onClick={() =>
                navigate(`/online/nova?tema=${encodeURIComponent(theme)}`)
              }
            >
              Configurar partida <ArrowRight size={20} aria-hidden="true" />
            </button>
          </>
        ) : preview ? (
          <RulesPreview
            room={preview}
            coins={player.coins}
            busy={busy}
            onJoin={() => void confirmJoin()}
            onBack={() => setPreview(null)}
          />
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

/** Regras da sala em uma linha: tema, tabuleiro, tempo por jogada e aposta. */
function RulesSummary({
  room,
}: {
  room: Pick<OnlineRoom, "puzzleId" | "rules" | "grid">;
}) {
  const rules = room.rules ?? NO_RULES;
  const grid = roomPuzzle(room);
  const size = BOARD_SIZES.find((s) => grid && s.id === sizeOf(grid));
  return (
    <ul className="online-rules" aria-label="Regras da partida">
      <li>
        Tema: <b>{themeOfPuzzle(room.puzzleId)?.nome ?? "Surpresa"}</b>
      </li>
      {size && (
        <li>
          Tabuleiro:{" "}
          <b>
            {size.cols}×{size.rows} · {size.nome}
          </b>
        </li>
      )}
      <li>
        <Timer size={16} aria-hidden="true" /> Jogada:{" "}
        <b>{turnLabel(rules.turnSeconds)}</b>
      </li>
      <li>
        <CoinIcon size={16} /> Aposta:{" "}
        <b>{rules.bet ? `${rules.bet} moedas` : "sem aposta"}</b>
      </li>
    </ul>
  );
}

/** Convidado: as regras da sala antes de entrar (e se ele tem moedas para a aposta). */
function RulesPreview({
  room,
  coins,
  busy,
  onJoin,
  onBack,
}: {
  room: OnlineRoom;
  coins: number;
  busy: boolean;
  onJoin: () => void;
  onBack: () => void;
}) {
  const bet = room.rules?.bet ?? 0;
  const short = coins < bet;
  return (
    <div className="online-preview">
      <h2>Partida de {room.host.name}</h2>
      <RulesSummary room={room} />
      {bet > 0 && (
        <p className="online-hint">
          {short
            ? `Você tem ${coins} moedas: não dá para apostar ${bet}.`
            : `Quem vencer leva ${2 * bet} moedas. Você tem ${coins}.`}
        </p>
      )}
      <button
        type="button"
        className="button primary"
        disabled={busy || short}
        onClick={onJoin}
      >
        <Swords size={20} aria-hidden="true" />{" "}
        {bet ? `Entrar e apostar ${bet}` : "Entrar na partida"}
      </button>
      <button type="button" className="button online-ghost" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar
      </button>
    </div>
  );
}

/** Configuração da partida (quem cria): tamanho do tabuleiro, tempo por jogada e aposta, depois cria a sala. */
export function OnlineSetup() {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const chosenTheme = search.get("tema") ?? SURPRISE_THEME;
  // Tamanho: começa no médio quando o tema tem (os temas do Casual têm todos). Qualquer tamanho
  // pode ser escolhido; se o tema não tiver aquele, a partida vira Surpresa (com aviso).
  const [board, setBoard] = useState<BoardSize>(() => {
    const sizes = themeSizes(chosenTheme);
    return sizes.includes(DEFAULT_BOARD)
      ? DEFAULT_BOARD
      : (sizes.at(-1) ?? DEFAULT_BOARD);
  });
  const themeFits = useMemo(
    () => themeSizes(chosenTheme).includes(board),
    [chosenTheme, board],
  );
  const theme = themeFits ? chosenTheme : SURPRISE_THEME;
  const themeName =
    onlineThemes().find((t) => t.id === theme)?.nome ?? "Surpresa";
  const [turnSeconds, setTurnSeconds] = useState(0);
  const [bet, setBet] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const backend = await onlineBackend();
      const uid = await backend.uid();
      const puzzle = pickOnlinePuzzle(theme, Math.random, board);
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
          rules: { turnSeconds, bet },
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
          theme_choice: chosenTheme,
          board: sizeOf(puzzle) ?? board,
          turn_seconds: turnSeconds,
          bet,
        });
        navigate(`/online/${fresh}`, { replace: true });
        return;
      }
      setError(UNAVAILABLE);
    } catch {
      setError(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">DUELO AO VIVO</span>
        <h1>Configurar partida</h1>
      </div>
      <section
        className="online-card online-setup"
        aria-label="Configurar partida"
      >
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
        <p className="online-setup-theme">
          Tema: <b>{themeName}</b> · <Link to="/online">trocar</Link>
        </p>
        <BoardSizePicker value={board} onChange={setBoard} />
        <Choices
          title="Tempo por jogada"
          options={TURN_OPTIONS}
          value={turnSeconds}
          label={(v) => (v ? turnLabel(v) : "Livre")}
          onChange={setTurnSeconds}
        />
        <Choices
          title="Aposta"
          options={BET_OPTIONS}
          value={bet}
          label={(v) => (v ? String(v) : "Sem")}
          disabled={(v) => v > player.coins}
          onChange={setBet}
        />
        <p className="online-hint" role="status">
          {bet
            ? `Cada um aposta ${bet}: quem vencer leva ${2 * bet} moedas. Você tem ${player.coins}.`
            : `Partida sem aposta. Você tem ${player.coins} moedas.`}
        </p>
        <button
          type="button"
          className="button primary"
          disabled={busy || bet > player.coins}
          onClick={() => void create()}
        >
          <Swords size={20} aria-hidden="true" /> Criar partida
        </button>
        {error && (
          <p className="online-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}

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

  // Partida em andamento fica marcada no jogador: o aviso no topo oferece voltar a ela. Sala que
  // sumiu ou acabou deixa de ser marcada (senão o aviso não sai mais da tela).
  const live = isLive(room);
  useEffect(() => {
    if (room === undefined) return;
    const active = usePlayer.getState().player.activeOnline;
    if (live && role && active !== code)
      update((p) => ({ ...p, activeOnline: code }));
    if ((!live || !role) && active === code)
      update((p) => ({ ...p, activeOnline: undefined }));
  }, [live, role, room, code, update]);

  // Sala parada há muito tempo (ninguém entrou ou ninguém joga): encerra sem vencedor.
  const expired = !!room && isExpired(room);
  useEffect(() => {
    if (expired && backend) void backend.expire(code).catch(() => {});
  }, [expired, backend, code]);

  // O amigo abandonou: a vitória (e as moedas dela) fica com quem ficou, uma vez só.
  const wonByForfeit = wonByForfeitOf(room, uid);
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

  // Partida terminada: quem criou a sala ganha as moedas de convite deste amigo (uma vez por amigo).
  const friend = role === "host" ? room?.guest?.uid : undefined;
  const [inviteEarned, setInviteEarned] = useState(0);
  useEffect(() => {
    if (room?.status !== "finished" || !friend) return;
    const reward = inviteReward(
      usePlayer.getState().player.invitedFriends,
      friend,
    );
    if (!reward) return;
    update((p) => ({
      ...p,
      coins: p.coins + reward,
      invitedFriends: [...(p.invitedFriends ?? []), friend],
    }));
    setInviteEarned(reward);
    track("invite_rewarded");
  }, [room?.status, friend, update]);

  // Aposta: cada um reserva a sua quando a partida começa; no fim, quem venceu leva as duas, o
  // empate devolve a de cada um e quem abandonou perde a sua. Uma vez por sala.
  const bet = room?.rules?.bet ?? 0;
  const [betResult, setBetResult] = useState<number | null>(null);
  useEffect(() => {
    if (!bet || !role || !room || !uid) return;
    const reserved = usePlayer.getState().player.wagers?.[code];
    if (room.status === "playing" && reserved === undefined) {
      update((p) => ({
        ...p,
        coins: Math.max(0, p.coins - bet),
        wagers: { ...p.wagers, [code]: bet },
      }));
      track("online_bet_placed", { bet });
      return;
    }
    if (reserved === undefined) return;
    let result: "win" | "draw" | "loss" | undefined;
    if (room.status === "abandoned")
      result =
        room.endedBy === ROOM_EXPIRED
          ? "draw"
          : room.left !== uid
            ? "win"
            : "loss";
    if (room.status === "finished") {
      const mine = toView(room.state, role).scores;
      result = mine.p > mine.ai ? "win" : mine.p === mine.ai ? "draw" : "loss";
    }
    if (!result) return;
    const payout = betPayout(reserved, result);
    update((p) => {
      const wagers = { ...p.wagers };
      delete wagers[code];
      return { ...p, coins: p.coins + payout, wagers };
    });
    setBetResult(payout - reserved);
  }, [bet, role, room, uid, code, update]);

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

  const invitesLeft = economy.inviteMax - (player.invitedFriends ?? []).length;
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
        <RulesSummary room={room} />
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
        {invitesLeft > 0 && (
          <p className="online-invite-bonus">
            <CoinIcon size={18} /> Ganhe {economy.invite} moedas quando um amigo
            novo jogar com você (faltam {invitesLeft}).
          </p>
        )}
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
      : heading(
          "Partida encerrada",
          room.endedBy === ROOM_EXPIRED
            ? "A partida ficou parada por mais de um dia e foi encerrada. Ninguém ganhou nem perdeu."
            : room.endedBy && room.endedBy !== uid
              ? `${rivalProfile(rival).name} encerrou a partida porque você ficou fora por mais de ${RIVAL_OFFLINE_MS / 60_000} minutos.`
              : "Você saiu desta partida.",
        );

  return (
    <>
      {inviteEarned > 0 && (
        <div className="online-banner invite" role="status">
          <span>
            <CoinIcon size={18} /> Convite recompensado: +{inviteEarned} moedas
            por jogar com {rivalProfile(rival).name}!
          </span>
        </div>
      )}
      {betResult !== null && (
        <div
          className={`online-banner ${betResult > 0 ? "invite" : ""}`}
          role="status"
        >
          <span>
            <CoinIcon size={18} />{" "}
            {betResult > 0
              ? `Aposta ganha: +${betResult} moedas!`
              : betResult === 0
                ? "Empate: sua aposta voltou."
                : `Aposta perdida: ${betResult} moedas.`}
          </span>
        </div>
      )}
      {room.status === "playing" && !rivalOnline && (
        <div className="online-banner" role="status">
          <span>{rivalProfile(rival).name} está sem conexão.</span>
          {rivalGone && (
            <button
              type="button"
              onClick={() =>
                rival && void backend.abandon(code, rival.uid, uid)
              }
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
          // Duelo ao vivo não tem tutorial.
          guidedWord: undefined,
          sessionKey,
          // A tela guarda as letras ainda não confirmadas; sem nada salvo, vale o servidor.
          session: stored?.puzzleId === puzzle.id ? stored : view,
        }}
        online={{
          rival: rivalProfile(rival),
          incoming: view,
          onTurn: send,
          turnSeconds: room.rules?.turnSeconds,
          leaveWarning:
            room.status === "playing"
              ? `Sair da partida? Para voltar, use "Voltar para a partida" em Jogar com um amigo (código ${code}). Se ficar fora por mais de ${RIVAL_OFFLINE_MS / 60_000} minutos, ${rivalProfile(rival).name} pode encerrar e ficar com a vitória.`
              : undefined,
          notice:
            room.status === "playing" && !rivalOnline
              ? `${rivalProfile(rival).name} está sem conexão…`
              : undefined,
        }}
      />
    </>
  );
}

/**
 * Antes do duelo ao vivo, quem ainda está com o nome e o avatar padrão escolhe os dois: é assim que
 * o amigo o vê na partida. Fica na frente da sala (antes de entrar nela) e da criação da partida.
 */
export function OnlineProfileGate({
  joining,
  children,
}: {
  /** Entrando na sala de um amigo (o botão diz "Entrar no duelo"). */
  joining: boolean;
  children: ReactNode;
}) {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const [done, setDone] = useState(() => !needsProfile(player));
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => avatarOf(player.avatar).id);
  if (done) return <>{children}</>;
  const clean = name.trim().replace(/\s+/g, " ");
  const valid = clean.length >= NAME_MIN;
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    update((p) => ({ ...p, name: clean, avatar, profileSet: true }));
    track("online_profile_set", { avatar, joining });
    setDone(true);
  };
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">DUELO AO VIVO</span>
        <h1>Quem vai jogar?</h1>
      </div>
      <form
        className="online-card online-profile"
        aria-label="Seu nome e avatar"
        onSubmit={save}
      >
        <p className="online-hint">
          Seu amigo vai ver este nome e este avatar na partida.
        </p>
        <span className="profile-dialog-label">Escolha seu avatar</span>
        <ul className="avatar-picker" aria-label="Avatares">
          {PLAYER_AVATARS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={a.id === avatar ? "selected" : ""}
                aria-pressed={a.id === avatar}
                aria-label={a.name}
                onClick={() => setAvatar(a.id)}
              >
                <OpponentAvatar opponent={a} size={52} />
                <small>{a.name}</small>
              </button>
            </li>
          ))}
        </ul>
        <label className="profile-dialog-name">
          Seu nome
          <input
            value={name}
            maxLength={NAME_MAX}
            placeholder="Como seu amigo te chama"
            autoComplete="nickname"
            enterKeyHint="go"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="button primary" disabled={!valid}>
          {joining ? "Entrar no duelo" : "Continuar"}{" "}
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </form>
    </>
  );
}
/** Rotas do duelo ao vivo com o pedido de nome e avatar na frente. */
export function OnlineMatchRoute() {
  return (
    <OnlineProfileGate joining>
      <OnlineMatch />
    </OnlineProfileGate>
  );
}
export function OnlineSetupRoute() {
  return (
    <OnlineProfileGate joining={false}>
      <OnlineSetup />
    </OnlineProfileGate>
  );
}
