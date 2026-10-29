import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Frown, Handshake, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { VictoryStars } from "../animations/components/VictoryCelebration";
import { ChestReward } from "../components/ChestReward";
import { OpponentPortrait } from "../components/OpponentPortrait";
import type { Mood, OpponentProfile } from "../game/opponents";

export type DuelResult = "win" | "draw" | "loss";

interface Props {
  result: DuelResult;
  rival: OpponentProfile;
  mood: Mood;
  moodKey: number;
  scores: { p: number; ai: number };
  /** Moedas que a partida pagou (0 quando não há recompensa). */
  coins: number;
  /** Estrelas ganhas (só na vitória da campanha). */
  stars: number;
  /** Rota da próxima fase, quando há. */
  nextTo?: string;
  /** Nome do oponente da próxima fase. */
  nextRival?: string;
  /** Progresso do mundo e das estrelas (vitória na campanha). */
  progress?: { world: string; done: number; total: number; stars: number };
  /** Nome do mundo que acabou de ser desbloqueado, se foi o caso. */
  unlocked?: string;
  /** Moedas do baú do mundo abertas agora (vitória sobre o chefe). */
  chest?: number;
  enabled: boolean;
  onClose: () => void;
}

const COPY: Record<
  DuelResult,
  { title: string; text: (name: string) => string }
> = {
  win: { title: "Vitória!", text: (n) => `Você fez mais pontos que ${n}.` },
  draw: {
    title: "Empate",
    text: (n) => `Você e ${n} terminaram com a mesma pontuação.`,
  },
  loss: {
    title: "Derrota",
    text: (n) => `${n} fez mais pontos desta vez. Tente de novo!`,
  },
};

/**
 * Janela que anuncia o fim do duelo (vitória, empate ou derrota). Aparece uma vez, quando a
 * partida termina agora; o painel de resultado continua na tela por trás e fica acessível ao
 * fechar. Fica abaixo da camada de efeitos, então as moedas voam por cima dela.
 */
export function ResultPopup({
  result,
  rival,
  mood,
  moodKey,
  scores,
  coins,
  stars,
  nextTo,
  nextRival,
  progress,
  unlocked,
  chest,
  enabled,
  onClose,
}: Props) {
  const Icon =
    result === "win" ? Trophy : result === "draw" ? Handshake : Frown;
  const { title, text } = COPY[result];
  // Quem fala: o oponente comenta o resultado (vitória dele na derrota do jogador e vice-versa).
  const quote =
    result === "loss"
      ? rival.win
      : result === "win"
        ? rival.lose
        : rival.tagline;
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <motion.div
      className="result-backdrop"
      data-testid="result-popup"
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        className={`result-dialog ${result}`}
        role="dialog"
        aria-modal="true"
        aria-label="Resultado da partida"
        initial={enabled ? { opacity: 0, scale: 0.8, y: 16 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="result-icon" aria-hidden="true">
          <Icon size={44} />
        </span>
        <h2>{title}</h2>
        <p className="result-text">{text(rival.name)}</p>
        <p className="result-quote">
          <OpponentPortrait
            opponent={rival}
            mood={mood}
            moodKey={moodKey}
            size={52}
            animate={enabled}
          />
          <span>
            <b>{rival.name}:</b> “{quote}”
          </span>
        </p>
        <div className="result-score" aria-label="Placar final">
          <span>
            <b>{scores.p}</b> Você
          </span>
          <span aria-hidden="true">×</span>
          <span>
            <b>{scores.ai}</b> {rival.name}
          </span>
        </div>
        {coins > 0 && <p className="result-coins">+{coins} moedas</p>}
        {chest ? <ChestReward coins={chest} animated={enabled} /> : null}
        {stars > 0 && (
          <VictoryStars count={stars} enabled={enabled} decorative />
        )}
        {progress && (
          <div className="result-progress">
            <span>
              {progress.world} · {progress.done}/{progress.total} fases · ★{" "}
              {progress.stars}
            </span>
            <span
              className="bar"
              role="progressbar"
              aria-label={`Progresso em ${progress.world}`}
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
            >
              <i
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </span>
          </div>
        )}
        {unlocked && (
          <p className="result-unlocked" role="status">
            Novo mundo aberto: <b>{unlocked}</b>!
          </p>
        )}
        {nextTo && nextRival && (
          <p className="result-next">Próximo rival: {nextRival}</p>
        )}
        <div className="result-actions">
          {nextTo && (
            <Link className="button primary" to={nextTo} onClick={onClose}>
              Próxima fase
            </Link>
          )}
          <button
            ref={close}
            className={nextTo ? "text-link" : "button primary"}
            onClick={onClose}
          >
            {nextTo ? "Ver o tabuleiro" : "Continuar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
