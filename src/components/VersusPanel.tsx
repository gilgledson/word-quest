import { motion } from "motion/react";
import { Shield } from "lucide-react";
import { OpponentPortrait } from "./OpponentPortrait";
import type { Mood, OpponentProfile } from "../game/opponents";

interface Side {
  face: Pick<OpponentProfile, "id">;
  name: string;
  score: number;
  mood: Mood;
  moodKey: number;
}

/**
 * Painel de duelo no topo da partida: os dois avatares grandes em molduras com anel de cor (azul
 * para o jogador, roxo para o oponente), o placar em faixas com escudo, o selo VS no centro e uma
 * seta mostrando de quem é a vez. O anel de quem joga pulsa. Os rostos reagem com as expressões.
 */
export function VersusPanel({
  player,
  rival,
  turn,
  finished,
  animate,
}: {
  player: Side;
  rival: Side;
  turn: "p" | "ai";
  finished: boolean;
  animate: boolean;
}) {
  const side = (s: Side, who: "p" | "ai") => (
    <div
      className={`duelist ${who === "p" ? "player" : "rival"} ${!finished && turn === who ? "turn" : ""}`}
      data-testid={who === "p" ? "duelist-player" : "duelist-rival"}
    >
      <span className="duelist-frame">
        <OpponentPortrait
          opponent={s.face}
          mood={s.mood}
          moodKey={s.moodKey}
          size={46}
          animate={animate}
        />
      </span>
      <span className="duelist-info">
        <span className="duelist-name">{s.name}</span>
        <span className="duelist-score">
          <Shield size={14} aria-hidden="true" />
          <motion.strong
            key={s.score}
            initial={animate ? { scale: 1.6 } : false}
            animate={{ scale: 1 }}
          >
            {s.score}
          </motion.strong>
        </span>
      </span>
    </div>
  );
  return (
    <div className="versus-score" aria-label="Placar">
      {side(player, "p")}
      <div className="versus-center">
        <span className="vs-badge" aria-hidden="true">
          VS
        </span>
        <span
          className={`turn-arrow ${finished ? "done" : turn}`}
          role="status"
        >
          {finished ? "FIM" : turn === "p" ? "◀ sua vez" : "vez dele ▶"}
        </span>
      </div>
      {side(rival, "ai")}
    </div>
  );
}
