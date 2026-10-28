import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLetterDrag } from "../hooks/useLetterDrag";
import { useFitGrid, type BoardMode } from "../hooks/useFitGrid";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";
import { levels } from "../data/catalog";
import {
  PuzzleValidator,
  economy,
  normalize,
  positions,
  type Session,
} from "../game/crossword-engine";
import { OPPONENT_LEVELS, opponentTurn } from "../game/opponent";
import { usePlayer } from "../stores/player";
import { playSfx, type EffectName } from "../services/sound";
import { celebrate } from "../services/confetti";
import { buzz } from "../services/haptics";
import { ResultPopup } from "./ResultPopup";
import { VersusPanel } from "../components/VersusPanel";
import { useOpponentMood } from "../animations/hooks/useOpponentMood";
import { avatarOf } from "../game/avatars";
import { opponentOfSession, shortName } from "../game/opponents";
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
import { VictoryPanel } from "./puzzle/VictoryPanel";
import { settleSession } from "./puzzle/settleSession";
import { useScoreFloats } from "./puzzle/useScoreFloats";
const HINT_MESSAGE = "Arraste as letras até as casas ou toque para preencher.";
const BOARD_KEY = "wordquest-board";
const readMode = (): BoardMode => {
  try {
    const saved = localStorage.getItem(BOARD_KEY);
    return saved === "upright" || saved === "rotated" ? saved : "auto";
  } catch {
    return "auto";
  }
};
/** O jogo é um confronto: o oponente vem da fase (ou do sorteio no casual e no diário). */
export function PuzzlePage() {
  return <Duel />;
}
function Duel() {
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
  } = useDuelSetup();
  // Quem joga esta partida: o personagem gravado na sessão (partidas antigas usam o padrão do nível).
  const rival = opponentOfSession(session?.versus);
  const [selected, setSelected] = useState(
    () =>
      puzzle?.words.find((w) => session && !PuzzleValidator.correct(w, session))
        ?.id ?? "",
  );
  const [message, setMessage] = useState(HINT_MESSAGE);
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
  const drop = useRef<(tileId: string, cell: string | null) => void>(() => {});
  const botStep = useRef<() => void>(() => {});
  const cardRef = useRef<HTMLDivElement>(null);
  const { floats, flash, popScore, popPenalty } = useScoreFloats(
    cardRef,
    player.animations,
  );
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
  const finished = !!engine && !!session && engine.complete(session);
  const wasFinished = useRef(finished);
  useEffect(() => {
    // Toca o resultado só quando a partida termina agora, não ao reabrir uma já concluída.
    if (finished && !wasFinished.current && session) {
      const { p, ai } = session.scores;
      sfx(p > ai ? "win" : p === ai ? "draw" : "lose");
      if (p > ai) void celebrate(player.animations);
      setResultOpen(true);
    }
    wasFinished.current = finished;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  useEffect(() => {
    if (!botTurn) return;
    const timer = setTimeout(
      () => botStep.current(),
      player.animations ? 900 : 0,
    );
    return () => clearTimeout(timer);
  }, [botTurn, session?.versus?.rngCount, sessionKey, player.animations]);
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
  const current = active.find((c) => !session.letters[c.key]);
  const pending = (cell: string) =>
    !!session.letters[cell] && !session.locked.includes(cell);
  const hasPending = session.history.some(pending);
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
  const swapCost = (swapping?.length ?? 0) * economy.swap;
  const swapResult = swapping?.length
    ? engine.swap(session, swapping, word)
    : undefined;
  const commit = (next: Session, cost = 0) =>
    update((p) =>
      settleSession(p, next, cost, {
        engine,
        puzzleId: puzzle.id,
        sessionKey,
        daily,
        casual,
        date,
      }),
    );
  botStep.current = () => {
    const turn = opponentTurn(engine, session);
    commit(turn.session);
    const total = turn.gained + turn.bonus;
    if (turn.gained)
      popScore(
        turn.session.locked.filter((k) => !session.locked.includes(k)),
        turn.gained,
        turn.bonus,
        "ai",
      );
    if (turn.gained) sfx(turn.bonus ? "word" : "botMove", turn.gained);
    else sfx("botPass");
    setMessage(
      turn.plan.wordId === null
        ? `${rival.name} passou a vez.`
        : turn.gained
          ? `${rival.name} confirmou ${turn.gained} letra${turn.gained > 1 ? "s" : ""} (+${total}). Sua vez!`
          : `${rival.name} errou e passou a vez. Sua vez!`,
    );
  };
  const afford = (cost: number) => {
    if (player.coins >= cost) return true;
    setMessage("Moedas insuficientes para esta ação.");
    sfx("error");
    return false;
  };
  const choose = (wordId: string) => {
    const w = puzzle.words.find((w) => w.id === wordId)!;
    setSelected(wordId);
    setMessage(
      engine.solved(session).some((s) => s.id === wordId)
        ? "Palavra descoberta! Escolha outra pista."
        : HINT_MESSAGE,
    );
    return w;
  };
  const insert = (tileId: string, cellKey = current?.key) => {
    if (!mine) return false;
    if (!word) {
      setMessage("Toque em uma pista para começar.");
      return false;
    }
    if (!cellKey || complete) return false;
    const next = engine.insert(session, word.id, tileId, cellKey);
    if (next === session) return false;
    setMessage("Confirme com ✓ quando terminar a jogada.");
    commit(next);
    sfx("place");
    return true;
  };
  // Soltar uma letra vale para qualquer casa não confirmada: seleciona a palavra dela e
  // substitui uma letra pendente que já esteja lá.
  drop.current = (tileId, cell) => {
    if (!mine || complete) return;
    const target = engine.matrix().find((c) => c.key === cell);
    const belongs =
      target?.kind === "letter"
        ? puzzle.words.filter((w) => target.wordIds.includes(w.id))
        : [];
    if (!cell || !belongs.length || session.locked.includes(cell)) {
      setMessage("Solte em uma casa que ainda não foi confirmada.");
      return;
    }
    const w =
      belongs.find((x) => x.id === selected) ??
      belongs.find((x) => !solved.some((s) => s.id === x.id)) ??
      belongs[0];
    // Letra já colocada (ainda não confirmada) é movida; letra do banco é inserida.
    const from = session.tiles[tileId]?.cell;
    if (from === cell) return;
    const next = from
      ? engine.relocate(session, w.id, from, cell!)
      : engine.insert(session, w.id, tileId, cell);
    if (next === session) {
      setMessage("Solte em uma casa que ainda não foi confirmada.");
      return;
    }
    setSelected(w.id);
    setMessage(
      pending(cell)
        ? "Letra trocada. Confirme com ✓ quando terminar a jogada."
        : "Confirme com ✓ quando terminar a jogada.",
    );
    commit(next);
    sfx(pending(cell) ? "replace" : "place");
  };
  const unplace = (cell: string) => {
    const next = engine.remove(session, word, cell);
    if (!next) return;
    commit(next);
    sfx("remove");
    setMessage("Letra devolvida ao banco.");
  };
  const confirm = () => {
    if (!mine || complete) return;
    const r = engine.confirm(session, "p");
    setPulse((n) => n + 1);
    fx.emit(
      r.wrongCells.map((cellId) => ({
        type: "LETTER_REJECTED" as const,
        cellId,
        letter: session.letters[cellId] ?? "",
      })),
    );
    const next: Session = engine.complete(r.session)
      ? r.session
      : { ...r.session, versus: { ...versus, turn: "ai" } };
    commit(next);
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
      const won = r.gained + r.bonus;
      const parts = [
        won ? `+${won} ponto${won > 1 ? "s" : ""}` : "Nenhuma letra certa",
        r.penalty
          ? `−${r.penalty} ponto${r.penalty > 1 ? "s" : ""} por letra errada`
          : "",
        r.returned ? `${r.returned} voltaram ao banco` : "",
        engine.complete(r.session) ? "" : `vez de ${rival.name}`,
      ].filter(Boolean);
      setMessage(parts.join(" · "));
    }
  };
  const firstOpen = () =>
    word && !solved.some((s) => s.id === word.id)
      ? word
      : puzzle.words.find((w) => !solved.some((s) => s.id === w.id));
  const hint = () => {
    const target = firstOpen();
    if (!mine || !target || complete || !afford(economy.hint)) return;
    const next = engine.hint(session, target.id);
    if (!next) return;
    setSelected(target.id);
    commit(next, economy.hint);
    sfx("hint");
    setMessage("Uma ajudinha para seguir em frente.");
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
  const nextTo =
    !daily && !casual && winner === "win" && puzzle.number < levels.length
      ? `/play/${levels[puzzle.number].id}`
      : undefined;
  return (
    <div className="puzzle-page" ref={setFxHost}>
      <section className="puzzle-status" aria-label="Progresso da fase">
        <div className="puzzle-top">
          <Link className="round-button" aria-label="Voltar" to={backTo}>
            <ArrowLeft />
          </Link>
          <div>
            <span className="eyebrow">
              {daily
                ? "DESAFIO DO DIA"
                : casual
                  ? `CASUAL · ${theme?.nome.toUpperCase()}`
                  : "DUELO"}{" "}
              · {OPPONENT_LEVELS[versus.level].label.toUpperCase()}
            </span>
            <h2>
              {daily
                ? "Uma descoberta diária"
                : casual
                  ? `Grade ${puzzle.number}`
                  : `Fase ${puzzle.number}`}
            </h2>
          </div>
          <span className="pill">
            {solved.length}/{puzzle.words.length}
          </span>
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
          onNext={() => setSelected("")}
          onReplay={() => {
            const fresh = engine.start(`${sessionKey}:${Date.now()}`, botLevel);
            update((p) => ({
              ...p,
              sessions: { ...p.sessions, [sessionKey]: fresh },
            }));
            setSelected("");
            setMessage("Toque em uma pista para começar de novo.");
          }}
        />
      ) : (
        <>
          <section className="selected-word">
            <span className="eyebrow">
              {botTurn
                ? "VEZ DO OPONENTE"
                : word
                  ? `${word.direction === "horizontal" ? "→ HORIZONTAL" : "↓ VERTICAL"} · ${normalize(word.answer).length} LETRAS`
                  : "TOQUE EM UMA PISTA"}
            </span>
            <h2>
              {botTurn
                ? `${rival.name} pensando…`
                : (word?.clue ?? "Escolha por onde começar")}
              {botTurn && prefs.enabled && <TurnThinkingEffect />}
            </h2>
            <p aria-live="polite">{message}</p>
          </section>
          <TurnControls
            rack={rack}
            letterDrag={letterDrag}
            mine={mine}
            animated={player.animations}
            fxEnabled={prefs.enabled}
            hasPending={hasPending}
            pulse={pulse}
            hinting={hinting}
            onInsert={insert}
            onSwap={() => setSwapping([])}
            onConfirm={confirm}
            onHint={hint}
          />
        </>
      )}
      {swapping && (
        <SwapDialog
          rack={rack}
          selected={swapping}
          cost={swapCost}
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
          enabled={prefs.enabled}
          onClose={() => setResultOpen(false)}
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
