import { Joyride, type EventData, type Step } from "react-joyride";

const LOCALE = {
  back: "Voltar",
  close: "Fechar",
  last: "Entendi",
  next: "Próximo",
  nextWithProgress: "Próximo ({current} de {total})",
  skip: "Dispensar",
  open: "Abrir",
};
/** Visual do WordQuest: azul do botão ✓, texto escuro e cantos arredondados. */
const OPTIONS = {
  primaryColor: "#1263cf",
  textColor: "#1c2733",
  backgroundColor: "#fffdf4",
  overlayColor: "rgba(10, 40, 90, 0.66)",
  zIndex: 1500,
  skipBeacon: true,
  skipScroll: true,
  spotlightRadius: 16,
  spotlightPadding: 8,
  overlayClickAction: false as const,
  width: 300,
};
const STYLES = {
  tooltip: { borderRadius: 18, fontFamily: "inherit", padding: 4 },
  tooltipTitle: { fontWeight: 900, fontSize: 19, color: "#124fb5" },
  tooltipContent: { fontSize: 16, lineHeight: 1.45 },
  buttonPrimary: {
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 15,
    padding: "10px 16px",
  },
  buttonBack: { color: "#4a5c6b", fontWeight: 700 },
  buttonSkip: { color: "#4a5c6b", fontWeight: 700 },
};
const TOUR_STEPS: Step[] = [
  {
    target: ".board-area",
    title: "A grade",
    content:
      "Cada casa verde traz uma pista. Toque nela para escolher a palavra e ver onde as letras entram.",
    placement: "bottom",
  },
  {
    target: ".letter-bank",
    title: "Suas letras",
    content:
      "Arraste uma letra até a casa, ou toque nela, para preencher a palavra escolhida.",
    placement: "top",
  },
  {
    target: ".puzzle-tools",
    title: "Confirmar, Trocar e Dica",
    content:
      "Confirmar fecha a jogada: letra certa vale 1 ponto, errada custa 1 e volta ao banco. Trocar renova letras e Dica coloca uma das suas letras na casa certa; confirme para valer ponto.",
    placement: "top",
  },
  {
    target: ".versus-score",
    title: "O duelo",
    content:
      "Você joga contra um rival, vez a vez. Fechar uma palavra vale a palavra inteira. Quem tiver mais pontos no fim vence!",
    placement: "bottom",
  },
];
const JOKER_STEPS: Step[] = [
  {
    target: ".letter-bank button.joker",
    title: "Chegou o curinga ★",
    content:
      "Coloque-o em qualquer casa do tabuleiro. Você pode arrastá-lo para outro lugar; a letra certa só aparece quando confirmar. Você ganha um por partida.",
    placement: "top",
    buttons: ["primary"],
  },
];
const ended = (data: EventData) =>
  data.status === "finished" || data.status === "skipped";

/** Tour de apresentação da fase 1; `onFinish` roda ao concluir ou dispensar. */
export function GameTour({
  run,
  onFinish,
}: {
  run: boolean;
  onFinish: () => void;
}) {
  return (
    <Joyride
      run={run}
      continuous
      steps={TOUR_STEPS}
      locale={LOCALE}
      options={{
        ...OPTIONS,
        showProgress: true,
        buttons: ["back", "skip", "primary"],
      }}
      styles={STYLES}
      onEvent={(data) => {
        if (ended(data)) onFinish();
      }}
    />
  );
}
/** Apresentação do curinga, uma única vez, quando a peça chega ao banco. */
export function JokerTour({
  run,
  onFinish,
}: {
  run: boolean;
  onFinish: () => void;
}) {
  return (
    <Joyride
      run={run}
      continuous
      steps={JOKER_STEPS}
      locale={LOCALE}
      options={OPTIONS}
      styles={STYLES}
      onEvent={(data) => {
        if (ended(data)) onFinish();
      }}
    />
  );
}
