import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
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
}: Props) {
  const campaignWin = result === "win" && !daily && !casual;
  return (
    <motion.section
      initial={animated ? { opacity: 0, y: 15 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="victory"
    >
      {campaignWin && <VictoryBadge enabled={fxEnabled} />}
      <h2>
        {result === "win"
          ? "Você venceu o duelo!"
          : result === "draw"
            ? "Empate!"
            : `${rivalName} venceu`}
      </h2>
      <p>
        Você {scores.p} × {scores.ai} {rivalName}
      </p>
      <p>
        {daily
          ? result === "win"
            ? `Recompensa diária: ${economy.daily} moedas`
            : "Vença o oponente para concluir o desafio do dia."
          : economy.duel[result] < 0
            ? `A derrota custou ${-economy.duel[result]} moedas`
            : `Recompensa do duelo: ${economy.duel[result]} moedas`}
        {campaignWin && (
          <>
            {" · "}
            <VictoryStars
              count={economy.duelStars[level]}
              enabled={fxEnabled}
            />
          </>
        )}
      </p>
      {nextTo && (
        <Link className="button primary" to={nextTo} onClick={onNext}>
          Próxima descoberta <ArrowRight size={18} />
        </Link>
      )}
      <Link className="text-link" to={backTo}>
        {online
          ? "Desafiar de novo"
          : casual
            ? "Escolher outro tema"
            : "Voltar à jornada"}
      </Link>
      {!online && (
        <button
          className={result === "loss" ? "button primary" : "text-link"}
          onClick={onReplay}
        >
          {result === "loss" ? "Tentar de novo" : "Jogar novamente"}
        </button>
      )}
    </motion.section>
  );
}
