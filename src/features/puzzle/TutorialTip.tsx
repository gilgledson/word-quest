import { useEffect, useState } from "react";

const STEPS: Record<number, string> = {
  1: "Toque numa letra do banco para jogar",
  2: "Toque em Confirmar: certa +1, errada −1",
  3: "Vez do rival: as letras roxas são dele",
};
interface Props {
  step: number;
  /** Letra do banco que serve na casa azul (só no primeiro passo): o passo diz qual tocar. */
  letter?: string;
  botTurn: boolean;
  /** Chamado ao terminar (a vez volta ao jogador depois do rival) ou ao pular. */
  onDone: () => void;
}
/** Dica contextual da fase 1: acompanha a partida em 3 passos e some sozinha. */
export function TutorialTip({ step, letter, botTurn, onDone }: Props) {
  const [sawRival, setSawRival] = useState(false);
  useEffect(() => {
    if (botTurn) setSawRival(true);
    else if (sawRival) onDone();
    // onDone só grava a preferência; não precisa reiniciar o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, sawRival]);
  return (
    <div className={`tutorial-tip ${step === 3 ? "quiet" : ""}`} role="note">
      <b>{step}/3</b>
      <span>
        {step === 1 && letter
          ? `Toque no ${letter} que brilha para jogar`
          : STEPS[step]}
      </span>
      <button type="button" onClick={onDone}>
        Pular
      </button>
    </div>
  );
}
