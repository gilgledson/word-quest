import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { OpponentPortrait } from "./OpponentPortrait";
import { FrameArt } from "./FrameArt";
import type { FrameId } from "../game/frames";
import type { Mood, OpponentProfile } from "../game/opponents";
import { MT } from "../i18n/match";

interface Side {
  face: Pick<OpponentProfile, "id">;
  name: string;
  score: number;
  mood: Mood;
  moodKey: number;
  /** Sem conexão (duelo ao vivo): o rosto fica em cinza com o selo de wi-fi cortado. */
  offline?: boolean;
  /** Tocar no rosto encerra a partida (o amigo sumiu há tempo demais); sem isso, não é botão. */
  onClaim?: () => void;
  /** Moldura de perfil em volta do rosto (a do jogador; no duelo online, também a do rival). */
  frame?: FrameId;
}

/**
 * Painel de duelo no topo da partida: os dois avatares grandes em molduras com anel de cor (azul
 * para o jogador, roxo para o oponente), o placar em faixas com escudo, o selo VS no centro e uma
 * seta mostrando de quem é a vez. O anel de quem joga pulsa. Os rostos reagem com as expressões.
 * Com tempo por jogada (`clock`), o VS dá lugar a um cronômetro com os segundos que restam
 * (docs/referencias/relogio-vs-chatgpt.png). No duelo ao vivo, o amigo sem conexão aparece com o
 * rosto em cinza e o selo de wi-fi cortado (docs/referencias/aviso-offline-chatgpt.png).
 */
export function VersusPanel({
  player,
  rival,
  turn,
  finished,
  animate,
  clock,
  glow,
}: {
  player: Side;
  rival: Side;
  turn: "p" | "ai";
  finished: boolean;
  animate: boolean;
  /** Relógio da vez: duração em segundos e uma chave que muda a cada vez (recomeça a contagem). */
  clock?: { seconds: number; key: string | number };
  /** Placar que brilha quando as estrelas de uma palavra fechada chegam (a chave repete o brilho). */
  glow?: { owner: "p" | "ai"; key: number };
}) {
  const portrait = (s: Side) => (
    <>
      <OpponentPortrait
        opponent={s.face}
        mood={s.mood}
        moodKey={s.moodKey}
        size={38}
        animate={animate}
      />
      {s.frame && <FrameArt frame={s.frame} />}
      {s.offline && (
        <span className="offline-badge" aria-hidden="true">
          <WifiOff strokeWidth={3} />
        </span>
      )}
    </>
  );
  const side = (s: Side, who: "p" | "ai") => (
    <div
      className={`duelist ${who === "p" ? "player" : "rival"} ${!finished && turn === who ? "turn" : ""} ${s.offline ? "offline" : ""}`}
      data-testid={who === "p" ? "duelist-player" : "duelist-rival"}
    >
      {s.onClaim ? (
        <button
          type="button"
          className={`duelist-frame claim ${s.frame ? "has-frame" : ""}`}
          aria-label={MT.offlineClaim(s.name)}
          onClick={s.onClaim}
        >
          {portrait(s)}
        </button>
      ) : (
        <span
          className={`duelist-frame ${s.frame ? "has-frame" : ""}`}
          aria-label={s.offline ? MT.offline(s.name) : undefined}
          role={s.offline ? "img" : undefined}
        >
          {portrait(s)}
        </span>
      )}
      <span className="duelist-info">
        <span className="duelist-name">{s.name}</span>
        <span
          key={glow?.owner === who ? glow.key : undefined}
          className={`duelist-score ${glow?.owner === who ? "glow" : ""}`}
          aria-label={MT.scorePoints(s.score)}
        >
          <motion.strong
            key={s.score}
            initial={animate ? { scale: 1.6 } : false}
            animate={{ scale: 1 }}
          >
            {s.score}
          </motion.strong>
          <small aria-hidden="true">{MT.pts}</small>
        </span>
      </span>
    </div>
  );
  return (
    <div className="versus-score" aria-label={MT.scoreboard}>
      {side(player, "p")}
      <div className="versus-center">
        {clock ? (
          <TurnClock
            key={clock.key}
            seconds={clock.seconds}
            animate={animate}
          />
        ) : (
          <span className="vs-badge" aria-hidden="true">
            VS
          </span>
        )}
        <span
          className={`turn-arrow ${finished ? "done" : turn}`}
          role="status"
        >
          {finished ? MT.end : turn === "p" ? MT.yourTurn : MT.rivalTurnArrow}
        </span>
      </div>
      {side(rival, "ai")}
    </div>
  );
}

/** Abaixo disto, o cronômetro fica vermelho e treme de leve: a vez está acabando. */
const LOW_SECONDS = 5;

/**
 * Cronômetro da vez no lugar do VS: anel que esvazia (CSS, sem re-renderizar a grade) e os segundos
 * que restam no meio. A troca de vez desmonta e remonta (pela `key`), recomeçando do total.
 */
function TurnClock({
  seconds,
  animate,
}: {
  seconds: number;
  animate: boolean;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const rest = Math.max(
        0,
        seconds - Math.floor((Date.now() - start) / 1000),
      );
      setLeft(rest);
      if (!rest) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [seconds]);
  return (
    <span
      className={`vs-clock${left <= LOW_SECONDS ? " low" : ""}${animate ? "" : " still"}`}
      role="timer"
      aria-label={MT.turnClock(seconds)}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="vs-clock-track" cx="18" cy="18" r="15.5" />
        <circle
          className="vs-clock-ring"
          cx="18"
          cy="18"
          r="15.5"
          pathLength={100}
          style={{ animationDuration: `${seconds}s` }}
        />
      </svg>
      <b aria-hidden="true">{left}</b>
    </span>
  );
}
