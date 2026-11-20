import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, type PanInfo } from "motion/react";
import { ArrowLeft, ArrowRight, Award, ChevronUp, Swords } from "lucide-react";
import { ShareResultButton } from "../../components/ShareResultButton";
import { OpponentAvatar } from "../../components/OpponentAvatar";
import { OpponentPortrait } from "../../components/OpponentPortrait";
import { CoinIcon } from "../../components/CoinIcon";
import { VictoryStars } from "../../animations/components/VictoryCelebration";
import { economy } from "../../game/crossword-engine";
import type { Mood, OpponentProfile } from "../../game/opponents";
import { track } from "../../services/telemetry";

export type DuelResult = "win" | "draw" | "loss";

interface Props {
  result: DuelResult;
  playerName: string;
  /** Rosto do jogador (avatar escolhido no perfil). */
  playerFace: Pick<OpponentProfile, "id">;
  rival: OpponentProfile;
  mood: Mood;
  moodKey: number;
  scores: { p: number; ai: number };
  /** Moedas da partida: positivo quando pagou, negativo quando tirou, 0 sem mudança. */
  coins: number;
  /** Estrelas ganhas (vitória na campanha). */
  stars: number;
  /** A palavra mais longa que o jogador fez (ver `bestWord`). */
  best?: string;
  /** Rota e rival da próxima fase, quando há. */
  nextTo?: string;
  nextRival?: string;
  nextRivalId?: string;
  /** Mundo aberto agora, se foi o caso. */
  unlocked?: string;
  /** Conquistas que esta partida completou. */
  achievements?: string[];
  daily: boolean;
  casual: boolean;
  /** Duelo ao vivo: a revanche chama um amigo de novo (a sala acabou). */
  online: boolean;
  backTo: string;
  /** Texto para compartilhar o resultado. */
  shareResult?: string;
  /** Atalho para o duelo online (primeiras vitórias de quem ainda não chamou um amigo). */
  invite?: boolean;
  /** Animações ligadas e sem "reduzir movimento". */
  enabled: boolean;
  onNext: () => void;
  onReplay: () => void;
  /** O jogador recolheu o cartão: a vez de pedir a nota na loja, por exemplo. */
  onCollapse?: () => void;
}

const TITLE: Record<DuelResult, (rival: string) => string> = {
  win: () => "Você venceu!",
  draw: () => "Empate!",
  loss: (rival) => `${rival} venceu`,
};

/** Moldura do vencedor (aro dourado com louros, coroa e raios; arte gerada no ChatGPT). */
function WinnerFrame() {
  return (
    <img
      className="result-winner-frame"
      src="/art/resultado/moldura-vencedor.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

/**
 * Fim da partida em bottom sheet, no layout de docs/referencias/fim-partida-chatgpt.png: cartão
 * flutuante de borda dourada por cima da grade esmaecida, com a faixa do resultado (dourada,
 * azul-prateada ou bronze; docs/referencias/faixas-titulo-chatgpt.png), os dois jogadores
 * (o vencedor com louros e brilho), as moedas, a melhor palavra e os botões. Arrastar para baixo (ou
 * tocar na alça) recolhe numa faixa com o placar; tocar nela ou arrastar para cima abre de novo.
 */
export function ResultSheet(props: Props) {
  const {
    result,
    playerName,
    playerFace,
    rival,
    mood,
    moodKey,
    scores,
    coins,
    stars,
    best,
    nextTo,
    nextRival,
    nextRivalId,
    unlocked,
    achievements = [],
    daily,
    casual,
    online,
    backTo,
    shareResult,
    invite,
    enabled,
    onNext,
    onReplay,
    onCollapse,
  } = props;
  // Partida terminada: o cartão sobe aberto (também ao reabrir uma fase já concluída).
  const [open, setOpen] = useState(true);
  // Recolher o cartão avisa a tela (uma vez por recolhida).
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) onCollapse?.();
    wasOpen.current = open;
  }, [open, onCollapse]);
  const title = TITLE[result](rival.name);
  const card = useRef<HTMLElement>(null);
  // Ao abrir, o foco vai para o cartão (o leitor de tela anuncia o resultado). No botão, o anel de
  // foco aparecia como uma borda grossa em volta dele no celular.
  useEffect(() => {
    if (open) card.current?.focus({ preventScroll: true });
  }, [open]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (open && (info.offset.y > 70 || info.velocity.y > 500)) setOpen(false);
    else if (!open && (info.offset.y < -40 || info.velocity.y < -500))
      setOpen(true);
  };
  const backLabel = online ? "Voltar" : casual ? "Outro tema" : "Voltar";
  // A revanche é o botão grande; com próxima fase, ela desce para a linha de baixo.
  const revanche = online ? (
    <Link
      className={
        nextTo ? "button result-sheet-ghost" : "button primary result-sheet-go"
      }
      to={backTo}
    >
      Revanche
    </Link>
  ) : (
    <button
      type="button"
      className={
        nextTo ? "button result-sheet-ghost" : "button primary result-sheet-go"
      }
      onClick={onReplay}
      aria-label={
        result === "loss"
          ? "Revanche: tentar de novo"
          : "Revanche: jogar de novo"
      }
    >
      Revanche
    </button>
  );
  return (
    <>
      {open && (
        <motion.div
          className="result-sheet-scrim"
          aria-hidden="true"
          initial={enabled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          onClick={() => setOpen(false)}
        />
      )}
      <motion.section
        ref={card}
        tabIndex={-1}
        className={`result-sheet ${result} ${open ? "open" : "closed"}`}
        aria-label="Resultado da partida"
        data-testid="result-sheet"
        initial={enabled ? { y: "110%" } : false}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.25}
        dragListener={enabled}
        onDragEnd={onDragEnd}
      >
        <button
          type="button"
          className="result-sheet-handle"
          aria-expanded={open}
          aria-label={open ? "Ver tabuleiro" : `Ver resultado: ${title}`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="result-sheet-grip" aria-hidden="true" />
          {!open && (
            <span className="result-sheet-bar" aria-hidden="true">
              <b>{title}</b>
              <span>
                {scores.p} × {scores.ai}
              </span>
              <ChevronUp size={20} />
            </span>
          )}
        </button>
        {open && (
          <div className="result-sheet-body">
            {/* Faixa do título: arte gerada no ChatGPT (public/art/resultado), o texto é do app. */}
            <h2 className={`result-ribbon ${result}`}>
              <span>{title}</span>
            </h2>
            <div className="result-duelists" aria-label="Placar final">
              <span className={result === "win" ? "winner" : undefined}>
                <span className="result-face player">
                  <OpponentAvatar opponent={playerFace} size={84} />
                  {result === "win" && <WinnerFrame />}
                </span>
                <b>{playerName}</b>
                <strong className="pts player">
                  {scores.p} <small>pts</small>
                </strong>
              </span>
              <i aria-hidden="true">×</i>
              <span className={result === "loss" ? "winner" : undefined}>
                <span className="result-face rival">
                  <OpponentPortrait
                    opponent={rival}
                    mood={mood}
                    moodKey={moodKey}
                    size={84}
                    animate={enabled}
                  />
                  {result === "loss" && <WinnerFrame />}
                </span>
                <b>{rival.name}</b>
                <strong className="pts rival">
                  {scores.ai} <small>pts</small>
                </strong>
              </span>
            </div>
            {(coins !== 0 || stars > 0) && (
              <div className="result-sheet-rewards">
                {coins !== 0 && (
                  <p
                    className={`result-sheet-coins ${coins < 0 ? "lost" : ""}`}
                    aria-label={
                      coins < 0
                        ? `A derrota custou ${-coins} moedas`
                        : daily
                          ? `Recompensa diária: ${coins} moedas`
                          : `Recompensa do duelo: ${coins} moedas`
                    }
                  >
                    <CoinIcon size={26} />
                    {coins > 0 ? `+${coins}` : `−${-coins}`} moedas
                  </p>
                )}
                {stars > 0 && (
                  <VictoryStars count={stars} total={3} enabled={enabled} />
                )}
              </div>
            )}
            {achievements.length > 0 && (
              <p className="result-sheet-note" role="status">
                <Award size={18} aria-hidden="true" />
                <span className="sr-only">
                  {achievements.length === 1 ? "Conquista" : "Conquistas"}:{" "}
                </span>
                <b>{achievements.join(", ")}</b>
                <span className="sr-only">. Resgate no Perfil.</span>
              </p>
            )}
            {unlocked && (
              <p className="result-sheet-note" role="status">
                Novo mundo aberto: <b>{unlocked}</b>!
              </p>
            )}
            {daily && result !== "win" && (
              <p className="result-sheet-hint">
                Vença o oponente para concluir o desafio do dia.
              </p>
            )}
            {invite && (
              <Link
                className="result-sheet-note invite"
                to="/online"
                aria-label="Desafiar um amigo online"
                onClick={() => track("online_cta_clicked", { from: "result" })}
              >
                <Swords size={18} aria-hidden="true" />
                Desafie um amigo: <b>+{economy.invite} moedas</b>
              </Link>
            )}
            {best && (
              <div className="result-best">
                <span>Melhor palavra</span>
                <span className="result-best-tiles" aria-label={best}>
                  {[...best].map((letter, i) => (
                    <i key={i} aria-hidden="true">
                      {letter}
                    </i>
                  ))}
                </span>
              </div>
            )}
            <div className="result-sheet-actions">
              {nextTo ? (
                <Link
                  className="button primary result-sheet-go"
                  to={nextTo}
                  onClick={onNext}
                  aria-label={
                    nextRival
                      ? `Próxima fase · vs ${nextRival}`
                      : "Próxima fase"
                  }
                >
                  {nextRivalId && (
                    <OpponentAvatar opponent={{ id: nextRivalId }} size={32} />
                  )}
                  Próxima fase
                  <ArrowRight size={22} aria-hidden="true" />
                </Link>
              ) : (
                revanche
              )}
              <div className="result-sheet-row">
                {shareResult && (
                  // Com "Próxima fase", a linha de baixo já tem dois botões: compartilhar fica só com o ícone.
                  <ShareResultButton
                    text={shareResult}
                    label={nextTo ? "" : "Compartilhar"}
                    className={`button result-sheet-ghost share${nextTo ? " icon" : ""}`}
                  />
                )}
                {nextTo && revanche}
                <Link className="button result-sheet-ghost back" to={backTo}>
                  <ArrowLeft size={20} aria-hidden="true" /> {backLabel}
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.section>
    </>
  );
}
