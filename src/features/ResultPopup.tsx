import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShareResultButton } from "../components/ShareResultButton";
import { Award, Frown, Handshake, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { VictoryStars } from "../animations/components/VictoryCelebration";
import { OpponentPortrait } from "../components/OpponentPortrait";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { CoinIcon } from "../components/CoinIcon";
import { avatarOf } from "../game/avatars";
import { usePlayer } from "../stores/player";
import type { Mood, OpponentProfile } from "../game/opponents";
import { medalsFor, type MatchSummary } from "./puzzle/summary";

export type DuelResult = "win" | "draw" | "loss";

interface Props {
  result: DuelResult;
  rival: OpponentProfile;
  mood: Mood;
  moodKey: number;
  scores: { p: number; ai: number };
  /** Moedas da partida: positivo quando pagou, negativo quando tirou (derrota), 0 sem mudança. */
  coins: number;
  /** Estrelas ganhas (só na vitória da campanha). */
  stars: number;
  /** Rota da próxima fase, quando há. */
  nextTo?: string;
  /** Nome do oponente da próxima fase. */
  nextRival?: string;
  /** Id do oponente da próxima fase (o rostinho dentro de "Próxima fase"). */
  nextRivalId?: string;
  /** Progresso do mundo e das estrelas (vitória na campanha). */
  progress?: { world: string; done: number; total: number; stars: number };
  /** Nome do mundo que acabou de ser desbloqueado, se foi o caso. */
  unlocked?: string;
  /** Títulos das conquistas que esta partida completou. */
  achievements?: string[];
  /** Resumo da partida (as medalhas saem dele). */
  summary?: MatchSummary;
  enabled: boolean;
  /** Texto do resultado para compartilhar (desafio do dia). */
  shareResult?: string;
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
  nextRivalId,
  progress,
  unlocked,
  achievements = [],
  summary,
  enabled,
  onClose,
  shareResult,
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
  const avatar = usePlayer((s) => s.player.avatar);
  // Selos ao lado das moedas: uma medalha à vista e o resto em "+N". Conquista nova tem a vez:
  // nessa partida as medalhas não aparecem (não cabem três selos numa linha de celular).
  const medals = summary && achievements.length === 0 ? medalsFor(summary) : [];
  const medalRoom = 1;
  const shownMedals = medals.slice(0, medalRoom);
  const moreMedals = medals.slice(medalRoom);
  const close = useRef<HTMLButtonElement>(null);
  // O foco vai para o botão (teclado e leitor de tela), mas sem o anel azul enquanto ninguém usa
  // o teclado: no toque ele parecia uma borda sobrando em volta de "Ver o tabuleiro".
  const [quietFocus, setQuietFocus] = useState(true);
  useEffect(() => close.current?.focus(), []);
  return (
    <motion.div
      className="result-backdrop"
      data-testid="result-popup"
      initial={enabled ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      onKeyDown={(e) => {
        setQuietFocus(false);
        if (e.key === "Escape") onClose();
      }}
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
        <span className="result-rays" aria-hidden="true" />
        {/* Cabeça (resultado) e corpo (prêmios e botões): uma coluna em pé, duas deitado. */}
        <div className="result-head">
          <span className="result-icon" aria-hidden="true">
            <Icon size={40} />
          </span>
          <h2>{title}</h2>
          {stars > 0 && (
            <VictoryStars
              count={stars}
              total={3}
              enabled={enabled}
              decorative
            />
          )}
          <p className="result-text">{text(rival.name)}</p>
          <div className="result-score" aria-label="Placar final">
            {/* A fala do rival sai do rosto dele, como um balão. */}
            <q className="result-bubble">
              <span>{quote}</span>
            </q>
            <span>
              <OpponentAvatar opponent={avatarOf(avatar)} size={58} />
              <b>{scores.p}</b> Você
            </span>
            <span aria-hidden="true">×</span>
            <span>
              <OpponentPortrait
                opponent={rival}
                mood={mood}
                moodKey={moodKey}
                size={58}
                animate={enabled}
              />
              <b>{scores.ai}</b> {rival.name}
            </span>
          </div>
        </div>
        <div className="result-body">
          {/* Prêmios numa linha só: moedas e conquistas como selos. */}
          {(coins !== 0 || achievements.length > 0 || medals.length > 0) && (
            <div className="result-rewards">
              {coins !== 0 && (
                <p className={`result-coins ${coins < 0 ? "lost" : ""}`}>
                  <CoinIcon size={18} />{" "}
                  {coins > 0 ? `+${coins}` : `−${-coins}`} moedas
                </p>
              )}
              {achievements.length > 0 && (
                <p
                  className="result-achievement"
                  role="status"
                  title="Resgate no Perfil"
                >
                  <Award size={16} aria-hidden="true" />
                  <span className="sr-only">
                    {achievements.length === 1 ? "Conquista" : "Conquistas"}
                    :{" "}
                  </span>
                  <b>{achievements.join(", ")}</b>
                  <span className="sr-only">. Resgate no Perfil.</span>
                </p>
              )}
              {medals.length > 0 && (
                <ul
                  className="result-medals"
                  aria-label="Medalhas desta partida"
                >
                  {shownMedals.map((m) => (
                    <li key={m.id} title={m.hint}>
                      <span aria-hidden="true">🏅</span> {m.label}
                    </li>
                  ))}
                  {moreMedals.length > 0 && (
                    <li
                      className="more"
                      title={moreMedals.map((m) => m.label).join(", ")}
                    >
                      <span className="sr-only">
                        {moreMedals.map((m) => m.label).join(", ")}
                      </span>
                      <span aria-hidden="true">+{moreMedals.length}</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          {progress && (
            <div className="result-progress">
              <span>
                {progress.world} · {progress.done}/{progress.total}
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
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </span>
            </div>
          )}
          {unlocked && (
            <p className="result-unlocked" role="status">
              Novo mundo aberto: <b>{unlocked}</b>!
            </p>
          )}
          {/* "Próxima fase" ocupa a linha; embaixo, "Ver o tabuleiro" e "Compartilhar" dividem outra. */}
          <div className="result-actions">
            {nextTo && (
              <Link
                className="button primary result-go"
                to={nextTo}
                onClick={onClose}
              >
                {nextRivalId && (
                  <OpponentAvatar opponent={{ id: nextRivalId }} size={36} />
                )}
                <span>
                  Próxima fase
                  {nextRival && (
                    <span className="result-go-rival"> · vs {nextRival}</span>
                  )}
                </span>
              </Link>
            )}
            <button
              ref={close}
              className={`button result-close ${nextTo ? "result-ghost" : "primary"} ${quietFocus ? "quiet-focus" : ""}`}
              onClick={onClose}
            >
              {nextTo ? "Ver o tabuleiro" : "Continuar"}
            </button>
            {shareResult && (
              <ShareResultButton
                text={shareResult}
                label=""
                className="button result-ghost result-share"
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
