import { useEffect, useState } from "react";

const STEPS: Record<number, string> = {
  1: "Toque numa letra do banco para jogar",
  2: "Toque em Confirmar: certa +1, errada −1",
  3: "Vez do rival: as letras roxas são dele",
  4: "Sua vez de novo: mais pontos vence",
};
const LAST = 4;
interface Props {
  /** Passo da jogada: 1 escolher a letra, 2 confirmar, 3 vez do rival. */
  step: number;
  /** Letra do banco que serve na casa azul (só no primeiro passo): o passo diz qual tocar. */
  letter?: string;
  botTurn: boolean;
  /** Chamado ao terminar (o jogador volta a jogar depois do rival, ou toca "Entendi"). */
  onDone: () => void;
  /** "Pular" antes do fim; sem ele, vale `onDone`. */
  onSkip?: () => void;
}
/**
 * Dica contextual da fase 1: acompanha a primeira rodada em 4 passos. Depois que o rival joga, o
 * último passo explica que a vez voltou e como se vence; some no "Entendi" ou na jogada seguinte.
 */
export function TutorialTip({ step, letter, botTurn, onDone, onSkip }: Props) {
  const [sawRival, setSawRival] = useState(false);
  const back = sawRival && !botTurn;
  useEffect(() => {
    if (botTurn) setSawRival(true);
    // A vez voltou e o jogador já colocou outra letra: o tutorial cumpriu o papel.
    else if (sawRival && step === 2) onDone();
    // onDone só grava a preferência; não precisa reiniciar o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, sawRival, step]);
  const shown = back ? LAST : step;
  return (
    <div className={`tutorial-tip ${shown === 3 ? "quiet" : ""}`} role="note">
      <b>
        {shown}/{LAST}
      </b>
      <span>
        {shown === 1 && letter
          ? `Toque no ${letter} que brilha para jogar`
          : STEPS[shown]}
      </span>
      <button type="button" onClick={back ? onDone : (onSkip ?? onDone)}>
        {back ? "Entendi" : "Pular"}
      </button>
    </div>
  );
}
