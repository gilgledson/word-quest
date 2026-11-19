import {
  ArrowRight,
  Map,
  RotateCcw,
  Swords,
  Shapes,
  Users,
} from "lucide-react";
import { track } from "../../services/telemetry";
import { Link } from "react-router-dom";
import { ShareResultButton } from "../../components/ShareResultButton";
import { motion } from "motion/react";
import { duelStars, economy } from "../../game/crossword-engine";
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
  /** Atalho para o duelo online (primeiras vitórias de quem ainda não chamou um amigo). */
  invite?: boolean;
}
/** Painel que substitui o banco de letras quando a grade fecha. */
export function VictoryPanel({
  result,
  daily,
  casual,
  rivalName,
  scores,
  animated,
  fxEnabled,
  nextTo,
  backTo,
  online,
  onNext,
  onReplay,
  shareResult,
  invite,
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
          <VictoryStars count={duelStars(scores)} enabled={fxEnabled} />
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
      {/* Atalhos como botões de verdade, do mesmo tamanho (os links de texto eram difíceis de tocar). */}
      <div className="victory-actions">
        {shareResult && (
          <ShareResultButton
            text={shareResult}
            label="Compartilhar"
            className="victory-action"
          />
        )}
        <Link
          className="victory-action"
          to={backTo}
          aria-label={
            online
              ? "Desafiar de novo"
              : casual
                ? "Escolher outro tema"
                : "Voltar à jornada"
          }
        >
          {online ? <Swords /> : casual ? <Shapes /> : <Map />}
          {online ? "Desafiar" : casual ? "Outro tema" : "Jornada"}
        </Link>
        {invite && (
          <Link
            className="victory-action"
            to="/online"
            aria-label="Desafiar um amigo online"
            onClick={() => track("online_cta_clicked", { from: "panel" })}
          >
            <Users />
            Amigo
          </Link>
        )}
        {!online && (result !== "loss" || nextTo) && (
          <button
            className="victory-action"
            onClick={onReplay}
            aria-label={
              result === "loss" ? "Tentar de novo" : "Jogar novamente"
            }
          >
            <RotateCcw />
            {result === "loss" ? "Tentar de novo" : "Jogar de novo"}
          </button>
        )}
      </div>
    </motion.section>
  );
}
