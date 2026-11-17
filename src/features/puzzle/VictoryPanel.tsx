import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ShareResultButton } from "../../components/ShareResultButton";
import { motion } from "motion/react";
import { economy, type BotLevel } from "../../game/crossword-engine";
import {
  VictoryBadge,
  VictoryStars,
} from "../../animations/components/VictoryCelebration";

interface Props {
  result: "win" | "draw" | "loss";
  daily: boolean;
  casual: boolean;
  rivalName: string;
  scores: { p: number; ai: number };
  level: BotLevel;
  /** Preferência "Animações" do perfil (entrada do painel). */
  animated: boolean;
  /** Animações ligadas e sem "reduzir movimento". */
  fxEnabled: boolean;
  /** Rota da próxima fase da campanha, quando há. */
  nextTo?: string;
  backTo: string;
  /** Duelo ao vivo: não há "jogar novamente" (a sala acabou). */
  online?: boolean;
  onNext: () => void;
  onReplay: () => void;
  /** Texto do resultado para compartilhar (desafio do dia). */
  shareResult?: string;
}
/** Painel que substitui o banco de letras quando a grade fecha. */
export function VictoryPanel({
  result,
  daily,
  casual,
  rivalName,
  scores,
  level,
  animated,
  fxEnabled,
  nextTo,
  backTo,
  online,
  onNext,
  onReplay,
  shareResult,
}: Props) {
  const campaignWin = result === "win" && !daily && !casual;
  const coins = daily
    ? result === "win"
      ? economy.daily
      : 0
    : economy.duel[result];
  // Painel curto: a grade continua grande e legível depois do fim.
  return (
    <motion.section
      initial={animated ? { opacity: 0, y: 15 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="victory"
    >
      {campaignWin && <VictoryBadge enabled={fxEnabled} />}
      <h2 className={campaignWin ? "sr-only" : undefined}>
        {result === "win"
          ? "Você venceu o duelo!"
          : result === "draw"
            ? "Empate!"
            : `${rivalName} venceu`}
      </h2>
      <p className="victory-line">
        <span>
          Você {scores.p} × {scores.ai} {rivalName}
        </span>
        {coins !== 0 && (
          <span
            className={`victory-coins ${coins < 0 ? "lost" : ""}`}
            aria-label={
              coins < 0
                ? `A derrota custou ${-coins} moedas`
                : daily
                  ? `Recompensa diária: ${coins} moedas`
                  : `Recompensa do duelo: ${coins} moedas`
            }
          >
            {coins > 0 ? `+${coins}` : coins} moedas
          </span>
        )}
        {campaignWin && (
          <VictoryStars count={economy.duelStars[level]} enabled={fxEnabled} />
        )}
      </p>
      {daily && result !== "win" && (
        <p className="victory-hint">
          Vença o oponente para concluir o desafio do dia.
        </p>
      )}
      {nextTo ? (
        <Link className="button primary" to={nextTo} onClick={onNext}>
          Próxima fase <ArrowRight size={18} />
        </Link>
      ) : (
        result === "loss" &&
        !online && (
          <button className="button primary" onClick={onReplay}>
            Tentar de novo
          </button>
        )
      )}
      <div className="victory-links">
        {shareResult && (
          <ShareResultButton
            text={shareResult}
            label="Compartilhar"
            className="text-link"
          />
        )}
        <Link className="text-link" to={backTo}>
          {online
            ? "Desafiar de novo"
            : casual
              ? "Escolher outro tema"
              : "Voltar à jornada"}
        </Link>
        {!online && (result !== "loss" || nextTo) && (
          <button className="text-link" onClick={onReplay}>
            {result === "loss" ? "Tentar de novo" : "Jogar novamente"}
          </button>
        )}
      </div>
    </motion.section>
  );
}
