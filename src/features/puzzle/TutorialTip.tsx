import { useEffect, useState } from "react";

const STEPS: Record<number, string> = {
  1: "Toque numa letra do banco para jogar",
  2: "Agora toque em Confirmar",
  3: "Rival jogando… depois é a sua vez",
};
interface Props {
  step: number;
  botTurn: boolean;
  /** Chamado ao terminar (a vez volta ao jogador depois do rival) ou ao pular. */
  onDone: () => void;
}
/** Dica contextual da fase 1: acompanha a partida em 3 passos e some sozinha. */
export function TutorialTip({ step, botTurn, onDone }: Props) {
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
      <span>{STEPS[step]}</span>
      <button type="button" onClick={onDone}>
        Pular
      </button>
    </div>
  );
}
