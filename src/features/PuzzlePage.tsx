import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLetterDrag } from "../hooks/useLetterDrag";
import { TileFlights, useTileFlights } from "../hooks/useTileFlights";
import { useFitGrid, type BoardMode } from "../hooks/useFitGrid";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";
import {
  levelGrid,
  levels,
  maps,
  mapOf,
  variantCount,
  worldLevels,
} from "../data/catalog";
import {
  PuzzleEngine,
  PuzzleValidator,
  easyDuel,
  economy,
  normalize,
  positions,
  roundOf,
  swapPrice,
  type Session,
} from "../game/crossword-engine";
import { OPPONENT_LEVELS, opponentTurn } from "../game/opponent";
import { usePlayer } from "../stores/player";
import { itemCount, spendItem, VOWELS } from "../game/shop";
import { ItemsDialog } from "./puzzle/ItemsDialog";
import { requestReview, shouldAskReview } from "../services/review";
import {
  boardShareText,
  currentStreak,
  dailyShareText,
} from "../game/dailyShare";
import { playSfx, type EffectName } from "../services/sound";
import { celebrate } from "../services/confetti";
import { buzz } from "../services/haptics";
import { ResultPopup } from "./ResultPopup";
import { VersusPanel } from "../components/VersusPanel";
import { useOpponentMood } from "../animations/hooks/useOpponentMood";
import { avatarOf } from "../game/avatars";
import {
  OPPONENT_BY_LEVEL,
  opponentById,
  opponentOfSession,
  shortName,
  type OpponentProfile,
} from "../game/opponents";
import { useAnimationPrefs } from "../animations/hooks/useAnimationPrefs";
import { useGameAnimations } from "../animations/hooks/useGameAnimations";
import { FxLayer } from "../animations/components/FxLayer";
import { TurnThinkingEffect } from "../animations/components/TurnThinkingEffect";
import { measureElement } from "../animations/utils/animationGeometry";
import { useDuelSetup } from "./puzzle/useDuelSetup";
import { Board } from "./puzzle/Board";
import { ScoreFloats } from "./puzzle/ScoreFloats";
import { SwapDialog } from "./puzzle/SwapDialog";
import { TurnControls } from "./puzzle/TurnControls";
import { JokerTour, TipTour, type TipId } from "./puzzle/GameTour";
import { confirmMessage } from "./puzzle/messages";
import { summarize } from "./puzzle/summary";
import { TutorialTip } from "./puzzle/TutorialTip";
import { VictoryPanel } from "./puzzle/VictoryPanel";
import { TutorialCoach } from "./puzzle/TutorialCoach";
import { guided, guideUsable, tutorialPick } from "./puzzle/tutorialPick";
import { settleSession } from "./puzzle/settleSession";
import { track } from "../services/telemetry";
import { achievedIds, achievementStatus } from "../game/achievements";
import { useScoreFloats } from "./puzzle/useScoreFloats";
/** Duração do relógio opcional do turno do jogador. */
const TURN_SECONDS = 25;
/** Até esta fase da campanha, a vitória convida para o duelo online (quem ainda não chamou amigo). */
const INVITE_UNTIL_LEVEL = 3;
/** Intervalo entre as letras que o rival coloca na grade. */
const BOT_LETTER_MS = 260;
const HINT_MESSAGE = "Arraste as letras até as casas ou toque para preencher.";
/** Avisos de rotina: o painel mostra o progresso da palavra no lugar deles (continuam lidos pelo leitor de tela). */
const isRoutineHint = (m: string) =>
  m === HINT_MESSAGE ||
  m.startsWith("Confirme com ✓") ||
  m === "Letra devolvida ao banco." ||
  m.startsWith("Letra trocada.");
/** Quanto tempo um aviso de resultado (pontos, erro, rival) fica visível antes de voltar ao progresso. */
const FEEDBACK_MS = 4500;
const BOARD_KEY = "wordquest-board";
const readMode = (): BoardMode => {
  try {
    const saved = localStorage.getItem(BOARD_KEY);
    return saved === "upright" || saved === "rotated" ? saved : "auto";
  } catch {
    return "auto";
  }
};
interface LastBotMove {
  cells: string[];
  gained: number;
  total: number;
  passed: boolean;
}
/** Frase completa da última vez do rival (aviso e leitor de tela). */
const lastBotText = (name: string, m: LastBotMove) =>
  m.passed
    ? `${name} passou a vez sem jogar.`
    : m.gained
      ? `${name} confirmou ${m.gained} letra${m.gained > 1 ? "s" : ""} e fez +${m.total}. As casas marcadas em roxo são dele.`
      : `${name} tentou uma palavra, errou e não pontuou.`;
/** Rótulo curto do chip da última jogada. */
const lastBotChip = (m: LastBotMove) =>
  m.passed
    ? "passou"
    : m.gained
      ? `${m.gained} letra${m.gained > 1 ? "s" : ""} · +${m.total}`
      : "errou";
/** Duelo ao vivo: o rival é outro jogador e as jogadas chegam do servidor. */
export interface OnlineDuel {
  rival: OpponentProfile;
  /** Estado mais recente da sala, já do ponto de vista deste jogador. */
  incoming: Session;
  /** Envia ao servidor a vez que este jogador acabou de confirmar. */
  onTurn: (next: Session) => void;
  /** Aviso fixo sobre a conexão do amigo, quando há. */
  notice?: string;
  /** Pergunta antes de sair pela seta de voltar (partida em andamento). */
  leaveWarning?: string;
  /** Tempo máximo de cada jogada escolhido na sala (0 ou ausente = sem limite). */
  turnSeconds?: number;
}
/** O jogo é um confronto: o oponente vem da fase (ou do sorteio no casual e no diário). */
export function PuzzlePage() {
  return <Duel setup={useDuelSetup()} />;
}
export function Duel({
  setup,
  online,
}: {
  setup: ReturnType<typeof useDuelSetup>;
  online?: OnlineDuel;
}) {
  const { player, update } = usePlayer();
  const sfx = (name: EffectName, count?: number) => {
    playSfx(player.sound, name, count);
    buzz(player.vibration, name);
  };
  const {
    daily,
    casual,
    date,
    puzzle,
    backTo,
    theme,
    botLevel,
    engine,
    sessionKey,
    session,
    guidedWord,
  } = setup;
  // Quem joga esta partida: o amigo (ao vivo) ou o personagem gravado na sessão.
  const rival = online?.rival ?? opponentOfSession(session?.versus);
  // No tutorial da fase 1 a partida começa na palavra guiada (o banco tem as letras dela). Numa
  // sessão antiga sem essas letras, vale o modelo anterior: uma palavra que o banco preenche.
  const [firstPick] = useState(() => {
    if (
      !puzzle ||
      !session ||
      player.tutorialDone ||
      daily ||
      casual ||
      puzzle.number !== 1
    )
      return undefined;
    const g = guidedWord && guided(guidedWord, session);
    if (g && guideUsable(g, session))
      return { wordId: g.wordId, cell: (g.next ?? g.cells[0]).key };
    return tutorialPick(puzzle, session);
  });
  const [selected, setSelected] = useState(
    () =>
      firstPick?.wordId ??
      puzzle?.words.find((w) => session && !PuzzleValidator.correct(w, session))
        ?.id ??
      "",
  );
  // Casa tocada na grade: a próxima peça entra nela (e não na primeira vazia da palavra).
  const [target, setTarget] = useState<string | null>(firstPick?.cell ?? null);
  const [message, setMessage] = useState(HINT_MESSAGE);
  const [feedback, setFeedback] = useState(false);
  // O jogador escolheu uma pista enquanto o rival joga (planejando a próxima jogada).
  const [chosenWhileWaiting, setChosenWhileWaiting] = useState(false);
  useEffect(() => {
    // Um aviso de rotina encerra o aviso de resultado na hora (não espera o tempo acabar).
    if (isRoutineHint(message)) {
      setFeedback(false);
      return;
    }
    setFeedback(true);
    const t = window.setTimeout(() => setFeedback(false), FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [message]);
  const [swapping, setSwapping] = useState<string[] | null>(null);
  const [boardMode, setBoardMode] = useState<BoardMode>(readMode);
  const grid = useFitGrid(puzzle?.cols ?? 8, puzzle?.rows ?? 10, boardMode);
  const turnBoard = () => {
    const next = grid.rotated ? "upright" : "rotated";
    setBoardMode(next);
    try {
      localStorage.setItem(BOARD_KEY, next);
    } catch {
      /* Preference is optional. */
    }
  };
  const drop = useRef<(tileId: string, cell: string | null) => boolean>(
    () => false,
  );
  const botStep = useRef<() => void>(() => {});
  const rivalMoved = useRef<(next: Session) => void>(() => {});
  const botTimers = useRef<number[]>([]);
  const expireTurn = useRef<() => void>(() => {});
  const [itemsOpen, setItemsOpen] = useState(false);
  const [botReveal, setBotReveal] = useState<Record<string, string> | null>(
    null,
  );
  // Resumo da última vez do rival: as casas dele ficam marcadas até o jogador confirmar a jogada.
  const [lastBot, setLastBot] = useState<LastBotMove | null>(null);
  useEffect(() => setLastBot(null), [sessionKey]);
  // Tocar no resumo faz as casas do rival piscarem de novo.
  const [botPing, setBotPing] = useState(false);
  useEffect(() => {
    if (!botPing) return;
    const t = window.setTimeout(() => setBotPing(false), 1300);
    return () => window.clearTimeout(t);
  }, [botPing]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { floats, flash, popScore, popPenalty } = useScoreFloats(
    cardRef,
    player.animations,
  );
  const tileFlights = useTileFlights(player.animations);
  const rectOf = (selector: string) =>
    document.querySelector(selector)?.getBoundingClientRect();
  const letterDrag = useLetterDrag((tileId, cell) =>
    drop.current(tileId, cell),
  );
  const prefs = useAnimationPrefs();
  const fx = useGameAnimations({
    engine,
    session,
    sessionKey,
    enabled: prefs.enabled,
    coins: player.coins,
  });
  const [fxHost, setFxHost] = useState<HTMLElement | null>(null);
  const [pulse, setPulse] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  // Conquistas que já estavam completas ao abrir a partida: o resultado só anuncia as novas.
  const [achBase, setAchBase] = useState(() => ({
    key: sessionKey,
    ids: achievedIds(player),
  }));
  if (achBase.key !== sessionKey)
    setAchBase({ key: sessionKey, ids: achievedIds(player) });
  const botTurn =
    !!engine && session?.versus.turn === "ai" && !engine.complete(session);
  const reaction = useOpponentMood({
    engine,
    session,
    botTurn,
    enabled: prefs.enabled,
  });
  const playerMood = useOpponentMood({
    engine,
    session,
    botTurn,
    enabled: prefs.enabled,
    who: "p",
  });
  useEffect(() => {
    if (!botTurn) setChosenWhileWaiting(false);
  }, [botTurn]);
  const finished = !!engine && !!session && engine.complete(session);
  const wasFinished = useRef(finished);
  // Medição da Aventura fase a fase (como nos jogos de fase): início, fim e abandono, com o número
  // da fase e da tentativa. Casual, Diário e duelo ao vivo não entram.
  const campaign =
    !daily &&
    !casual &&
    !online &&
    !!puzzle &&
    // Fase bloqueada (a anterior ainda não foi vencida) não conta: o jogador nem jogou.
    (puzzle.number === 1 || !!player.stars[levels[puzzle.number - 2]?.id]);
  const levelOpened = useRef<number>(Date.now());
  const levelAttempt = useRef(0);
  useEffect(() => {
    levelOpened.current = Date.now();
    if (!campaign || !session || !puzzle || finished) return;
    const fresh = session.versus.rngCount === 0 && !session.history.length;
    levelAttempt.current =
      usePlayer.getState().player.levelAttempts?.[puzzle.id] ?? 0;
    if (!fresh) return;
    const attempt = levelAttempt.current + 1;
    levelAttempt.current = attempt;
    update((p) => ({
      ...p,
      levelAttempts: { ...p.levelAttempts, [puzzle.id]: attempt },
    }));
    track("level_start", {
      level_number: puzzle.number,
      level_id: puzzle.id,
      bot_level: session.versus.level,
      opponent: session.versus.opponent ?? "",
      rounds: session.versus.rounds ?? 0,
      attempt,
    });
    // Uma vez por partida aberta (a revanche começa outra com outra semente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, session?.versus?.seed]);
  const quit = useRef<Record<string, string | number> | null>(null);
  quit.current =
    campaign && session && puzzle && !finished
      ? {
          level_number: puzzle.number,
          level_id: puzzle.id,
          attempt: levelAttempt.current,
          round: session.versus.rngCount,
          score_player: session.scores.p,
          score_rival: session.scores.ai,
          duration_s: Math.round((Date.now() - levelOpened.current) / 1000),
        }
      : null;
  useEffect(
    () => () => {
      // Saiu da fase no meio da partida (voltar, outra tela ou fechar o app pela navegação).
      if (quit.current) track("level_quit", quit.current);
    },
    [sessionKey],
  );
  useEffect(() => {
    // Toca o resultado só quando a partida termina agora, não ao reabrir uma já concluída.
    if (finished && !wasFinished.current && session) {
      const { p, ai } = session.scores;
      sfx(p > ai ? "win" : p === ai ? "draw" : "lose");
      if (p > ai) void celebrate(player.animations);
      setResultOpen(true);
      track("duel_end", {
        result: p > ai ? "win" : p === ai ? "draw" : "loss",
        mode: online
          ? "online"
          : daily
            ? "diario"
            : casual
              ? "casual"
              : "aventura",
        level: session.versus.level,
        score_player: p,
        score_rival: ai,
        ...(campaign && puzzle
          ? {
              level_number: puzzle.number,
              attempt: levelAttempt.current,
              duration_s: Math.round((Date.now() - levelOpened.current) / 1000),
            }
          : {}),
      });
    }
    wasFinished.current = finished;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  useEffect(() => {
    if (!botTurn) return;
    botStep.current();
    return () => {
      botTimers.current.forEach((t) => window.clearTimeout(t));
      botTimers.current = [];
      setBotReveal(null);
    };
  }, [botTurn, session?.versus?.rngCount, sessionKey, player.animations]);
  // Ao vivo: a jogada do amigo chega do servidor (uma jogada nova tem número maior que o da tela).
  const incoming = online?.incoming;
  const incomingRev = incoming?.versus.rngCount;
  useEffect(() => {
    if (!incoming || !session) return;
    if (incoming.versus.rngCount <= session.versus.rngCount) return;
    rivalMoved.current(incoming);
    return () => {
      botTimers.current.forEach((t) => window.clearTimeout(t));
      botTimers.current = [];
      setBotReveal(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRev, sessionKey]);
  // Avisa uma vez quando o curinga chega ao banco.
  const hasJoker = !!session?.rack.some((id) => session.tiles[id].joker);
  const hadJoker = useRef(hasJoker);
  useEffect(() => {
    if (hasJoker && !hadJoker.current) {
      sfx("hint");
      setMessage(
        "Chegou o curinga ★! Coloque-o em qualquer casa: a letra certa só aparece ao confirmar.",
      );
    }
    hadJoker.current = hasJoker;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoker]);
  // Relógio opcional: ao zerar, a jogada pendente é confirmada (ou a vez passa).
  const inTutorial =
    !player.tutorialDone && !daily && !casual && puzzle?.number === 1;
  // Palavra guiada do tutorial: a primeira jogada monta essa palavra (ver `TutorialCoach`).
  const guide =
    inTutorial && guidedWord && session
      ? guided(guidedWord, session)
      : undefined;
  const guideActive = !!guide && !!session && guideUsable(guide, session);
  const coachOn =
    guideActive &&
    session?.versus?.turn === "p" &&
    !!engine &&
    !engine.complete(session);
  // A palavra guiada foi confirmada: conta uma vez só (fica marcada em `tipsSeen`).
  const guideConfirmed = !!guide?.confirmed;
  useEffect(() => {
    if (!inTutorial || !guideConfirmed || player.tipsSeen.includes("palavra"))
      return;
    track("tutorial_word_done", { word_length: guide?.cells.length ?? 0 });
    update((p) => ({ ...p, tipsSeen: [...p.tipsSeen, "palavra"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTutorial, guideConfirmed]);
  // Tutorial e primeiro duelo: quando a vez volta ao jogador, a palavra escolhida precisa fechar
  // com o banco (ou ao menos ter uma casa que ele preencha); senão, troca para uma que feche.
  const firstDuel = !daily && !casual && !online && easyDuel(session);
  useEffect(() => {
    if (
      !(inTutorial || firstDuel) ||
      guideActive ||
      !puzzle ||
      !session ||
      session.versus?.turn !== "p"
    )
      return;
    const pendingNow = session.history.some(
      (k) => session.letters[k] && !session.locked.includes(k),
    );
    if (pendingNow || engine?.complete(session)) return;
    const w = puzzle.words.find((x) => x.id === selected);
    const cells = w ? positions(w) : [];
    const cur =
      cells.find((c) => c.key === target && !session.letters[c.key]) ??
      cells.find((c) => !session.letters[c.key]);
    const playable =
      !!cur &&
      session.rack.some(
        (id) =>
          !session.tiles[id].joker && session.tiles[id].letter === cur.letter,
      );
    // No primeiro duelo só fica a palavra que fecha com o banco; antes dele, basta uma casa.
    const closes = !!w && !!engine?.rack.completes(session, w);
    if (closes || (!firstDuel && playable)) return;
    const pick = tutorialPick(puzzle, session);
    if (!pick) return;
    setSelected(pick.wordId);
    setTarget(pick.cell);
    // Só na volta da vez (e na abertura): a escolha do jogador no meio da vez é respeitada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inTutorial,
    sessionKey,
    session?.versus?.rngCount,
    session?.versus?.turn,
  ]);
  // No duelo ao vivo vale o tempo da sala; nas outras partidas, a opção do jogador.
  const turnSeconds = online ? (online.turnSeconds ?? 0) : TURN_SECONDS;
  const timerActive =
    (online ? turnSeconds > 0 : player.turnTimer) &&
    !inTutorial &&
    !!engine &&
    session?.versus.turn === "p" &&
    !engine.complete(session);
  useEffect(() => {
    if (!timerActive) return;
    const t = window.setTimeout(() => expireTurn.current(), turnSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [timerActive, session?.versus?.rngCount, sessionKey, turnSeconds]);
  if (!puzzle || !engine || !session)
    return (
      <div className="page-heading">
        <h1>Fase não encontrada</h1>
        <Link to="/map">Voltar ao mapa</Link>
      </div>
    );
  if (
    !daily &&
    !casual &&
    puzzle.number > 1 &&
    !player.stars[levels[puzzle.number - 2].id]
  )
    return (
      <div className="page-heading">
        <h1>Um passo de cada vez</h1>
        <p>Complete a fase anterior para desbloquear este caminho.</p>
        <Link to={backTo}>Voltar ao mapa</Link>
      </div>
    );
  const versus = session.versus;
  const mine = versus.turn === "p";
  const word = puzzle.words.find((w) => w.id === selected);
  const active = word ? positions(word) : [];
  const solved = engine.solved(session);
  const complete = engine.complete(session);
  const shortDuel = roundOf(session);
  // Progresso da palavra escolhida: letras já na grade (confirmadas ou não) e o que fechar vale.
  const filled = active.filter((c) => session.letters[c.key]).length;
  const wordClosed = !!word && solved.some((w) => w.id === word.id);
  // Na vez do rival, a pista escolhida pelo jogador aparece no painel; sem escolha, vale o último aviso.
  const waitingPreview = botTurn && chosenWhileWaiting && !!word && !wordClosed;
  const showMessage = feedback || !word || (botTurn && !waitingPreview);
  const current =
    active.find((c) => c.key === target && !session.letters[c.key]) ??
    active.find((c) => !session.letters[c.key]);
  const pending = (cell: string) =>
    !!session.letters[cell] && !session.locked.includes(cell);
  const pendingCount = session.history.filter(pending).length;
  // Dicas da fase 1, uma por vez, na ordem em que as mecânicas aparecem.
  const seen = player.tipsSeen;
  const tip: TipId | undefined =
    inTutorial && !player.tourDone && !complete
      ? !seen.includes("inicio") && !guidedWord
        ? "inicio"
        : botTurn && !seen.includes("duelo")
          ? "duelo"
          : mine && seen.includes("duelo") && !seen.includes("trocar")
            ? "trocar"
            : undefined
      : undefined;
  const hasPending = pendingCount > 0;
  const effectCells = (type: "LETTER_PLACED" | "HINT_REVEALED") =>
    new Set(
      fx.effects.flatMap(({ event }) =>
        event.type === type ? [event.cellId] : [],
      ),
    );
  const placedCells = effectCells("LETTER_PLACED");
  const revealedCells = effectCells("HINT_REVEALED");
  const hinting = revealedCells.size > 0;
  const rack = session.rack.map((tileId) => session.tiles[tileId]);
  const swapCost = swapPrice(swapping?.length ?? 0);
  const swapResult = swapping?.length
    ? engine.swap(session, swapping, word)
    : undefined;
  const commit = (
    next: Session,
    cost = 0,
    before: (p: typeof player) => typeof player = (p) => p,
  ) =>
    update((p) =>
      settleSession(before(p), next, cost, {
        engine,
        puzzleId: puzzle.id,
        sessionKey,
        daily,
        casual,
        date,
      }),
    );
  /** Mostra a jogada do rival (letra a letra, com som e pontos) e grava o resultado. */
  const showRivalMove = (turn: {
    session: Session;
    gained: number;
    bonus: number;
    passed: boolean;
  }) => {
    const fresh = turn.session.locked.filter(
      (k) => !session.locked.includes(k),
    );
    const animated = player.animations && fresh.length > 0;
    const finish = () => {
      setBotReveal(null);
      commit(turn.session);
      const total = turn.gained + turn.bonus;
      setLastBot({
        cells: fresh,
        gained: turn.gained,
        total,
        passed: turn.passed,
      });
      if (turn.gained) popScore(fresh, turn.gained, turn.bonus, "ai");
      if (turn.gained) {
        if (turn.bonus) sfx("word", turn.gained);
        else if (!animated) sfx("botMove", turn.gained);
      } else sfx("botPass");
      const rounds = roundOf(turn.session);
      const last =
        !!rounds &&
        rounds.round === rounds.rounds &&
        rounds.rounds > 1 &&
        !engine.complete(turn.session);
      setMessage(
        (turn.passed
          ? `${rival.name} passou a vez.`
          : turn.gained
            ? `${rival.name} confirmou ${turn.gained} letra${turn.gained > 1 ? "s" : ""} (+${total}). Sua vez!`
            : `${rival.name} errou e passou a vez. Sua vez!`) +
          (last ? " Última rodada!" : ""),
      );
    };
    const at = (ms: number, fn: () => void) =>
      botTimers.current.push(window.setTimeout(fn, ms));
    if (!player.animations) {
      at(0, finish);
      return;
    }
    // O rival "pensa" mais quando a jogada é maior e coloca as letras uma a uma. Ao vivo o amigo
    // já pensou: as letras entram logo.
    const think = online
      ? 250
      : fresh.length
        ? 500 + 130 * Math.min(fresh.length, 4)
        : 700 + (turn.passed ? 0 : 150);
    fresh.forEach((cell, i) =>
      at(think + BOT_LETTER_MS * i, () => {
        setBotReveal((r) => ({ ...r, [cell]: turn.session.letters[cell] }));
        sfx("botMove", 1);
      }),
    );
    at(think + BOT_LETTER_MS * fresh.length + (fresh.length ? 320 : 0), finish);
  };
  botStep.current = () => {
    // Ao vivo quem joga é o amigo: a vez dele chega pelo servidor (ver `rivalMoved`).
    if (online) return;
    const turn = opponentTurn(engine, session);
    showRivalMove({
      session: turn.session,
      gained: turn.gained,
      bonus: turn.bonus,
      passed: turn.plan.wordId === null,
    });
  };
  rivalMoved.current = (shared) => {
    // A grade mudou na vez do amigo: se as letras deste jogador não servem mais, ele recebe outras.
    const next = engine.rack.ensurePlayable(shared);
    const gained = next.locked.filter(
      (k) => !session.locked.includes(k),
    ).length;
    const scored = next.scores.ai - session.scores.ai;
    showRivalMove({
      // Os erros deste jogador não vêm do servidor: valem os da tela.
      session: { ...next, misses: session.misses },
      gained,
      bonus: Math.max(0, scored - gained),
      passed: gained === 0 && scored === 0,
    });
  };
  const afford = (cost: number) => {
    if (player.coins >= cost) return true;
    setMessage("Moedas insuficientes para esta ação.");
    sfx("error");
    return false;
  };
  const guideName = guidedWord
    ? positions(guidedWord)
        .map((c) => c.letter)
        .join("")
    : "";
  const choose = (wordId: string, cell?: string) => {
    const w = puzzle.words.find((w) => w.id === wordId)!;
    // Tutorial: enquanto a palavra guiada não sai, as outras pistas esperam.
    if (coachOn && guide && wordId !== guide.wordId) {
      setMessage(`Monte ${guideName} primeiro.`);
      return w;
    }
    if (botTurn) setChosenWhileWaiting(true);
    setSelected(wordId);
    setTarget(cell ?? null);
    setMessage(
      engine.solved(session).some((s) => s.id === wordId)
        ? "Palavra descoberta! Escolha outra pista."
        : HINT_MESSAGE,
    );
    return w;
  };
  const insert = (tileId: string, cellKey = current?.key) => {
    if (!mine) return false;
    if (coachOn && guide) {
      // Tutorial: a letra vai para uma casa da palavra guiada que pede essa letra (qualquer ordem).
      const letter = session.tiles[tileId]?.letter;
      const want = (key?: string) =>
        guide.cells.find(
          (c) =>
            c.key === key && c.letter === letter && !session.letters[c.key],
        );
      const spot =
        want(cellKey) ??
        guide.cells.find((c) => c.letter === letter && !session.letters[c.key]);
      if (!spot) {
        setMessage(`Essa letra não entra em ${guideName}.`);
        sfx("error");
        return false;
      }
      cellKey = spot.key;
    }
    if (!word) {
      setMessage("Toque em uma pista para começar.");
      return false;
    }
    if (!cellKey || complete) return false;
    const next = engine.insert(
      session,
      coachOn && guide ? guide.wordId : word.id,
      tileId,
      cellKey,
    );
    if (next === session) return false;
    setMessage("Confirme com ✓ quando terminar a jogada.");
    setTarget(null);
    const from = rectOf(`[data-tile="${tileId}"]`);
    commit(next);
    tileFlights.launch(
      tileId,
      session.tiles[tileId].joker ? "★" : session.tiles[tileId].letter,
      from,
      () => rectOf(`[data-cell="${cellKey}"]`),
    );
    sfx("place");
    return true;
  };
  // Soltar uma letra vale para qualquer casa não confirmada: seleciona a palavra dela e
  // substitui uma letra pendente que já esteja lá.
  drop.current = (tileId, cell) => {
    if (!mine || complete) return false;
    const target = engine.matrix().find((c) => c.key === cell);
    const belongs =
      target?.kind === "letter"
        ? puzzle.words.filter((w) => target.wordIds.includes(w.id))
        : [];
    if (!cell || !belongs.length || session.locked.includes(cell)) {
      setMessage("Solte em uma casa que ainda não foi confirmada.");
      return false;
    }
    if (coachOn && guide) {
      // Tutorial: só casas da palavra guiada, e só com a letra que cada uma pede.
      const spot = guide.cells.find((c) => c.key === cell);
      if (!spot) {
        setMessage(`Monte ${guideName} primeiro.`);
        return false;
      }
      if (session.tiles[tileId]?.letter !== spot.letter) {
        setMessage(`Essa casa pede o ${spot.letter}.`);
        sfx("error");
        return false;
      }
    }
    const w =
      (coachOn && guide
        ? belongs.find((x) => x.id === guide.wordId)
        : undefined) ??
      belongs.find((x) => x.id === selected) ??
      belongs.find((x) => !solved.some((s) => s.id === x.id)) ??
      belongs[0];
    // Letra já colocada (ainda não confirmada) é movida; letra do banco é inserida.
    const from = session.tiles[tileId]?.cell;
    if (from === cell) return true;
    const next = from
      ? engine.relocate(session, w.id, from, cell!)
      : engine.insert(session, w.id, tileId, cell);
    if (next === session) {
      setMessage("Solte em uma casa que ainda não foi confirmada.");
      return false;
    }
    setSelected(w.id);
    setTarget(null);
    setMessage(
      pending(cell)
        ? "Letra trocada. Confirme com ✓ quando terminar a jogada."
        : "Confirme com ✓ quando terminar a jogada.",
    );
    commit(next);
    sfx(pending(cell) ? "replace" : "place");
    return true;
  };
  const unplace = (cell: string) => {
    const next = engine.remove(session, word, cell);
    if (!next) return;
    setTarget(null);
    const tile = Object.values(session.tiles).find((t) => t.cell === cell);
    const from = rectOf(`[data-cell="${cell}"]`);
    commit(next);
    if (tile)
      tileFlights.launch(tile.id, tile.joker ? "★" : tile.letter, from, () =>
        rectOf(`[data-tile="${tile.id}"]`),
      );
    sfx("remove");
    setMessage("Letra devolvida ao banco.");
  };
  const confirm = () => {
    if (!mine || complete) return;
    // Tutorial: o ✓ só vale com a palavra guiada inteira (nunca vira "passar" nem jogada parcial).
    if (coachOn && guide && !guide.complete) {
      setMessage(`Complete ${guideName} para confirmar.`);
      return;
    }
    const r = engine.confirm(session, "p");
    setLastBot(null);
    setTarget(null);
    setPulse((n) => n + 1);
    fx.emit(
      r.wrongCells.map((cellId) => ({
        type: "LETTER_REJECTED" as const,
        cellId,
        letter: session.letters[cellId] ?? "",
      })),
    );
    // Ao vivo cada vez confirmada tem um número: é por ele que o amigo sabe que há jogada nova.
    const count = versus.rngCount + (online ? 1 : 0);
    const next: Session = engine.complete(r.session)
      ? { ...r.session, versus: { ...versus, rngCount: count } }
      : { ...r.session, versus: { ...versus, turn: "ai", rngCount: count } };
    // Letras erradas voltam ao banco voando, da casa até o lugar delas.
    const rejected = r.wrongCells.flatMap((cellId) => {
      const tile = Object.values(session.tiles).find((t) => t.cell === cellId);
      return tile ? [{ tile, from: rectOf(`[data-cell="${cellId}"]`) }] : [];
    });
    commit(next);
    online?.onTurn(next);
    for (const { tile, from } of rejected)
      tileFlights.launch(tile.id, tile.letter, from, () =>
        rectOf(`[data-tile="${tile.id}"]`),
      );
    if (r.gained)
      popScore(
        r.session.locked.filter((k) => !session.locked.includes(k)),
        r.gained,
        r.bonus,
        "p",
      );
    popPenalty(r.wrongCells, r.penalty);
    if (r.passed) sfx("pass");
    else if (r.gained) sfx(r.bonus ? "word" : "correct", r.gained);
    else sfx("wrong");
    if (r.passed) setMessage("Você passou a vez.");
    else {
      setMessage(
        confirmMessage({
          won: r.gained + r.bonus,
          penalty: r.penalty,
          returned: r.returned,
        }),
      );
    }
  };
  const firstOpen = () =>
    word && !solved.some((s) => s.id === word.id)
      ? word
      : puzzle.words.find((w) => !solved.some((s) => s.id === w.id));
  // Itens da loja: só na vez do jogador, fora do tutorial; o uso é gasto quando funciona.
  const itemCounts = {
    curinga: itemCount(player, "curinga"),
    vogal: itemCount(player, "vogal"),
  };
  const applyJoker = () => {
    const next = mine && !complete ? engine.addJoker(session, word) : undefined;
    setItemsOpen(false);
    if (!next) {
      setMessage("Não há espaço no banco para o curinga agora.");
      sfx("error");
      return;
    }
    commit(next, 0, (p) => spendItem(p, "curinga"));
    track("item_used", { item: "curinga" });
    sfx("hint");
    setMessage(
      "Curinga ★ no seu banco: coloque em qualquer casa, ele sempre acerta.",
    );
  };
  const applyVowel = (letter: string) => {
    const next =
      mine && !complete ? engine.takeLetter(session, letter, word) : undefined;
    setItemsOpen(false);
    if (!next) {
      setMessage(`A grade não precisa de mais ${letter} agora.`);
      sfx("error");
      return;
    }
    commit(next, 0, (p) => spendItem(p, "vogal"));
    track("item_used", { item: "vogal", letter });
    sfx("hint");
    setMessage(`A vogal ${letter} chegou ao seu banco.`);
  };
  const hint = () => {
    const target = firstOpen();
    if (coachOn || !mine || !target || complete || !afford(economy.hint))
      return;
    const next = engine.hint(session, target.id);
    if (!next) {
      setMessage("Nenhuma das suas letras serve para uma dica agora.");
      sfx("error");
      return;
    }
    const cell = (next.hinted ?? []).find((k) => !session.hinted?.includes(k));
    const hintWord = puzzle.words.find((w) =>
      positions(w).some((c) => c.key === cell),
    );
    setSelected((hintWord ?? target).id);
    setTarget(null);
    commit(next, economy.hint);
    sfx("hint");
    setMessage(
      "Dica colocou uma letra sua. Confirme com ✓ quando terminar a jogada.",
    );
  };
  const confirmSwap = () => {
    if (!swapping?.length) return;
    if (!swapResult) {
      setMessage("Não há letras diferentes e úteis para trocar.");
      return;
    }
    if (!afford(swapCost)) return;
    // As peças trocadas saem do banco com uma animação própria (medida antes de sumirem).
    if (fxHost)
      fx.emit(
        (swapping ?? []).flatMap((id) => {
          const el = fxHost.querySelector(`[data-tile="${id}"]`);
          return el
            ? [
                {
                  type: "TILE_SWAP_OUT" as const,
                  letter: session.tiles[id].letter,
                  rect: measureElement(fxHost, el),
                },
              ]
            : [];
        }),
      );
    commit(swapResult, swapCost);
    sfx("swap");
    setSwapping(null);
    setMessage("Letras trocadas. Boa sorte!");
  };
  const toggleSwap = (tileId: string) =>
    setSwapping((sel) =>
      !sel
        ? sel
        : sel.includes(tileId)
          ? sel.filter((t) => t !== tileId)
          : sel.length < economy.swapMax
            ? [...sel, tileId]
            : sel,
    );
  const winner =
    session.scores.p === session.scores.ai
      ? "draw"
      : session.scores.p > session.scores.ai
        ? "win"
        : "loss";
  // Partida terminada: o resultado pode ser compartilhado. O desafio do dia vai sem as letras (a
  // grade é a mesma para todos naquela data); Aventura e Casual vão com o tabuleiro de letras.
  const shareResult =
    !complete || online
      ? undefined
      : daily
        ? dailyShareText({
            date,
            session,
            rival: rival.name,
            streak: currentStreak(player.daily, date),
          })
        : boardShareText({
            title: casual
              ? `Casual: ${theme?.nome ?? "tema"}`
              : `Fase ${puzzle.number} · ${mapOf(puzzle.world).nome}`,
            puzzle,
            session,
            rival: rival.name,
          });
  expireTurn.current = () => {
    if (!mine || complete) return;
    setSwapping(null);
    confirm();
    setMessage((m) => `Tempo esgotado. ${m}`);
  };
  // Tutorial da fase 1 (só na campanha, para quem ainda não o concluiu).
  const tutorial =
    !player.tutorialDone && !daily && !casual && puzzle.number === 1;
  /** Pular o tutorial: encerra o gesto em andamento (as letras postas ficam) e conta onde parou. */
  const skipTutorial = (step: "word" | "confirm" | "rival") => {
    letterDrag.cancel();
    track("tutorial_skipped", {
      step,
      letters_placed: guide?.filled ?? 0,
      word_length: guide?.cells.length ?? 0,
    });
    update((p) => ({ ...p, tutorialDone: true }));
  };
  const tutorialStep = botTurn ? 3 : hasPending ? 2 : 1;
  // Primeiro passo: a peça do banco que serve na casa azul brilha sozinha, e o passo diz qual é.
  const spotlight =
    tutorial && !guideActive && tutorialStep === 1 && mine && current
      ? rack.find(
          (t) => !t.joker && t.letter === engine.rack.solution[current.key],
        )
      : undefined;
  // Vitória na campanha: progresso do mundo, rival seguinte e, se for o caso, mundo novo.
  const campaignWin = !daily && !casual && winner === "win";
  const world = mapOf(puzzle.world);
  const worldList = worldLevels(world.id);
  const worldDone = worldList.filter((l) => player.stars[l.id]).length;
  const nextWorld = maps[maps.indexOf(world) + 1];
  const progress = campaignWin
    ? {
        world: world.nome,
        done: worldDone,
        total: worldList.length,
        stars: worldList.reduce((n, l) => n + (player.stars[l.id] ?? 0), 0),
      }
    : undefined;
  const unlocked =
    campaignWin && nextWorld && worldDone === worldList.length
      ? nextWorld.nome
      : undefined;
  // Depois das primeiras vitórias, quem ainda não chamou um amigo é convidado para o duelo online.
  const inviteOnline =
    campaignWin &&
    !online &&
    puzzle.number <= INVITE_UNTIL_LEVEL &&
    !player.invitedFriends?.length &&
    !player.activeOnline;
  const nextTo =
    !daily && !casual && winner === "win" && puzzle.number < levels.length
      ? `/play/${levels[puzzle.number].id}`
      : undefined;
  return (
    <div
      className={`puzzle-page ${player.highContrast ? "high-contrast" : ""}`}
      ref={setFxHost}
      data-tutorial={tutorial && !complete ? tutorialStep : undefined}
      data-spotlight={spotlight ? "" : undefined}
    >
      <section className="puzzle-status" aria-label="Progresso da fase">
        <div className="puzzle-top">
          <Link
            className="round-button"
            aria-label="Voltar"
            to={backTo}
            onClick={(e) => {
              // Duelo ao vivo em andamento: sair sem querer deixava o amigo encerrar a partida.
              if (online?.leaveWarning && !window.confirm(online.leaveWarning))
                e.preventDefault();
            }}
          >
            <ArrowLeft />
          </Link>
          <div>
            <span className="eyebrow">
              {online ? (
                "DUELO AO VIVO"
              ) : (
                <>
                  {daily
                    ? "DESAFIO DO DIA"
                    : casual
                      ? `CASUAL · ${theme?.nome.toUpperCase()}`
                      : "DUELO"}{" "}
                  · {OPPONENT_LEVELS[versus.level].label.toUpperCase()}
                </>
              )}
            </span>
            <h2>
              {online
                ? `Contra ${shortName(rival)}`
                : daily
                  ? "Uma descoberta diária"
                  : casual
                    ? `Grade ${puzzle.number}`
                    : `Fase ${puzzle.number}`}
            </h2>
          </div>
          {shortDuel ? (
            // Duelo curto: o que importa é quantas rodadas faltam, não a grade inteira.
            <span
              className={`pill words-pill ${shortDuel.round === shortDuel.rounds && !complete ? "last-round" : ""}`}
              aria-label={`Rodada ${shortDuel.round} de ${shortDuel.rounds}`}
            >
              {shortDuel.round}/{shortDuel.rounds}
              <small aria-hidden="true">rodada</small>
            </span>
          ) : (
            <span
              className="pill words-pill"
              aria-label={`${solved.length} de ${puzzle.words.length} palavras fechadas`}
            >
              {solved.length}/{puzzle.words.length}
              <small aria-hidden="true">palavras</small>
            </span>
          )}
          <button
            className="round-button rotate-board"
            aria-label="Girar tabuleiro"
            aria-pressed={grid.rotated}
            onClick={turnBoard}
          >
            <RotateCw />
          </button>
        </div>
        <VersusPanel
          player={{
            face: avatarOf(player.avatar),
            name: player.name || "Você",
            score: session.scores.p,
            mood: playerMood.mood,
            moodKey: playerMood.key,
          }}
          rival={{
            face: rival,
            name: shortName(rival),
            score: session.scores.ai,
            mood: reaction.mood,
            moodKey: reaction.key,
          }}
          turn={versus.turn}
          finished={complete}
          animate={prefs.enabled}
        />
      </section>
      <div className="board-card" ref={cardRef}>
        <ScoreFloats floats={floats} />
        <Board
          puzzle={puzzle}
          engine={engine}
          session={session}
          grid={grid}
          letterDrag={letterDrag}
          selected={selected}
          active={active}
          currentKey={current?.key}
          mine={mine}
          flash={flash}
          placedCells={placedCells}
          botReveal={botReveal ?? undefined}
          lastBotCells={mine ? lastBot?.cells : undefined}
          lastBotPing={botPing}
          flying={tileFlights.flying}
          revealedCells={revealedCells}
          onChoose={choose}
          onUnplace={unplace}
        />
      </div>
      {complete ? (
        <VictoryPanel
          result={winner}
          daily={daily}
          casual={casual}
          rivalName={rival.name}
          scores={session.scores}
          level={versus.level}
          animated={player.animations}
          fxEnabled={prefs.enabled}
          nextTo={nextTo}
          backTo={backTo}
          online={!!online}
          onNext={() => setSelected("")}
          shareResult={shareResult}
          invite={inviteOnline}
          onReplay={() => {
            // Na campanha a revanche troca de grade: quem perdeu não joga de novo as mesmas palavras.
            const count = variantCount(puzzle.id);
            const rotate = !daily && !casual && !online && count > 1;
            const variant = ((player.variants?.[puzzle.id] ?? 0) + 1) % count;
            const grid = rotate ? levelGrid(puzzle.id, variant) : undefined;
            const fresh = (grid ? new PuzzleEngine(grid) : engine).start(
              `${sessionKey}:${Date.now()}`,
              botLevel,
            );
            update((p) => ({
              ...p,
              variants: grid
                ? { ...p.variants, [puzzle.id]: variant }
                : p.variants,
              sessions: { ...p.sessions, [sessionKey]: fresh },
            }));
            setSelected("");
            setMessage(
              grid
                ? "Grade nova: toque em uma pista para começar."
                : "Toque em uma pista para começar de novo.",
            );
          }}
        />
      ) : (
        <>
          <section className="selected-word">
            {mine && lastBot && (
              <button
                type="button"
                className="last-move"
                aria-label={`Última jogada: ${lastBotText(rival.name, lastBot)}`}
                onClick={() => {
                  setMessage(lastBotText(rival.name, lastBot));
                  setBotPing(true);
                }}
              >
                {shortName(rival)}: {lastBotChip(lastBot)}
              </button>
            )}
            <span className="eyebrow">
              {botTurn
                ? online
                  ? `VEZ DE ${shortName(rival).toUpperCase()}`
                  : "VEZ DO OPONENTE"
                : word
                  ? `${(word.direction === "horizontal") !== grid.rotated ? "→ HORIZONTAL" : "↓ VERTICAL"} · ${normalize(word.answer).length} LETRAS`
                  : "TOQUE EM UMA PISTA"}
            </span>
            <h2>
              {botTurn
                ? online
                  ? (online.notice ?? `${rival.name} está jogando…`)
                  : `${rival.name} pensando…`
                : (word?.clue ?? "Escolha por onde começar")}
              {botTurn && prefs.enabled && <TurnThinkingEffect />}
            </h2>
            <div className="message-slot">
              <p
                aria-live="polite"
                className={showMessage ? undefined : "message-hidden"}
              >
                {message}
              </p>
              {!showMessage && word && (
                <p className="word-progress" data-testid="word-progress">
                  {wordClosed ? (
                    "Palavra completa ✓"
                  ) : waitingPreview ? (
                    <>
                      Sua pista: <b>{word.clue}</b>
                      {` · ${filled}/${active.length}`}
                    </>
                  ) : (
                    <>
                      <b>
                        {filled}/{active.length}
                      </b>
                      {filled === active.length
                        ? " · confirme com ✓"
                        : ` · ${active.length - filled === 1 ? "resta 1" : `restam ${active.length - filled}`}`}
                      {` · +${active.length} ao completar`}
                    </>
                  )}
                </p>
              )}
              {tutorial && !coachOn && (
                <TutorialTip
                  step={tutorialStep}
                  letter={spotlight?.letter}
                  botTurn={botTurn}
                  onDone={() => {
                    track("tutorial_complete");
                    update((p) => ({ ...p, tutorialDone: true }));
                  }}
                  onSkip={() => skipTutorial("rival")}
                />
              )}
            </div>
            {timerActive && (
              <div
                className="turn-timer"
                role="timer"
                aria-label={`Relógio do turno: ${turnSeconds} segundos`}
              >
                <i
                  key={session.versus.rngCount}
                  style={{ animationDuration: `${turnSeconds}s` }}
                />
              </div>
            )}
          </section>
          <TurnControls
            rack={rack}
            letterDrag={letterDrag}
            mine={mine}
            animated={player.animations}
            fxEnabled={prefs.enabled}
            pendingCount={pendingCount}
            itemsCount={tutorial ? 0 : itemCounts.curinga + itemCounts.vogal}
            onItems={() => setItemsOpen(true)}
            spotlight={spotlight?.id}
            pulse={pulse}
            hinting={hinting}
            flying={tileFlights.flying}
            onInsert={insert}
            swapped={!!session.swapped}
            onSwap={() => !coachOn && setSwapping([])}
            onConfirm={confirm}
            onHint={hint}
            confirmLocked={coachOn && !guide?.complete}
            toolsLocked={coachOn}
          />
        </>
      )}
      <TileFlights flights={tileFlights.flights} land={tileFlights.land} />
      {coachOn && guide && (
        <TutorialCoach
          guide={guide}
          word={guideName}
          rack={rack}
          gained={
            guide.complete
              ? engine.previewConfirm(session, "p").gained
              : undefined
          }
          animated={prefs.enabled}
          pressing={letterDrag.pressing}
          onSkip={() => skipTutorial(guide.complete ? "confirm" : "word")}
        />
      )}
      <TipTour
        tip={tip}
        onSeen={(id) =>
          update((p) => ({ ...p, tipsSeen: [...p.tipsSeen, id] }))
        }
        onDismissAll={() => update((p) => ({ ...p, tourDone: true }))}
      />
      <JokerTour
        run={hasJoker && mine && !player.jokerTourDone}
        onFinish={() => update((p) => ({ ...p, jokerTourDone: true }))}
      />
      {itemsOpen && (
        <ItemsDialog
          counts={itemCounts}
          vowels={engine.takeable(session, VOWELS)}
          canJoker={!!engine.addJoker(session)}
          animated={prefs.enabled}
          shopLink={!online}
          onJoker={applyJoker}
          onVowel={applyVowel}
          onCancel={() => setItemsOpen(false)}
        />
      )}
      {swapping && (
        <SwapDialog
          rack={rack}
          selected={swapping}
          cost={swapCost}
          coins={player.coins}
          canSwap={!!swapResult}
          animated={prefs.enabled}
          onToggle={toggleSwap}
          onCancel={() => setSwapping(null)}
          onConfirm={confirmSwap}
        />
      )}
      {letterDrag.drag &&
        createPortal(
          <div
            ref={letterDrag.ghostRef}
            aria-hidden="true"
            className="drag-letter-ghost"
          >
            {letterDrag.drag.letter}
          </div>,
          document.body,
        )}
      {complete && resultOpen && (
        <ResultPopup
          result={winner}
          rival={rival}
          mood={reaction.mood}
          moodKey={reaction.key}
          scores={session.scores}
          coins={
            daily
              ? winner === "win"
                ? economy.daily
                : 0
              : economy.duel[winner]
          }
          stars={
            !daily && !casual && winner === "win"
              ? economy.duelStars[versus.level]
              : 0
          }
          nextTo={nextTo}
          nextRival={
            nextTo
              ? opponentById(OPPONENT_BY_LEVEL[puzzle.number + 1])?.name
              : undefined
          }
          nextRivalId={
            nextTo ? OPPONENT_BY_LEVEL[puzzle.number + 1] : undefined
          }
          progress={progress}
          unlocked={unlocked}
          achievements={achievementStatus(player)
            .filter((a) => a.done && !achBase.ids.includes(a.id))
            .map((a) => a.title)}
          summary={summarize(session)}
          enabled={prefs.enabled}
          shareResult={shareResult}
          invite={inviteOnline}
          onClose={() => {
            setResultOpen(false);
            // Vitória na Aventura: bom momento para pedir a nota na loja (com limites, ver review.ts).
            const wins = levels.filter((l) => player.stars[l.id]).length;
            if (campaignWin && !online && shouldAskReview(player, wins)) {
              update((p) => ({
                ...p,
                reviewAsks: [...(p.reviewAsks ?? []), new Date().toISOString()],
              }));
              void requestReview();
            }
          }}
        />
      )}
      <FxLayer
        effects={fx.effects}
        container={fxHost}
        reduced={prefs.reduced}
      />
    </div>
  );
}
