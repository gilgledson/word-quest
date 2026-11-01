import {
  Joyride,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from "react-joyride";

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
/** Dicas curtas da fase 1, cada uma mostrada só quando a mecânica aparece pela primeira vez. */
export type TipId = "inicio" | "confirmar" | "duelo" | "trocar";
const TIPS: Record<TipId, Step> = {
  inicio: {
    target: ".board-area",
    title: "Comece pela grade",
    content:
      "Toque numa pista para escolher a palavra. Depois arraste uma letra do banco até a casa, ou toque nela.",
    placement: "bottom",
  },
  confirmar: {
    target: ".confirm-button",
    title: "Confirme a jogada",
    content:
      "Confirmar fecha a jogada: letra certa vale 1 ponto; errada custa 1 e volta ao banco.",
    placement: "top",
  },
  duelo: {
    target: ".versus-score",
    title: "Agora é a vez do rival",
    content:
      "Vocês jogam vez a vez. Fechar uma palavra vale a palavra inteira. Quem tiver mais pontos no fim vence!",
    placement: "bottom",
  },
  trocar: {
    target: ".puzzle-tools",
    title: "Trocar e Dica",
    content:
      "Sem letra útil? Trocar renova as letras do banco por moedas. A Dica coloca uma das suas letras na casa certa; confirme para valer ponto.",
    placement: "top",
  },
};
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

/** Balão de uma dica avulsa: o "Dispensar" do joyride some no último passo, e aqui ele precisa existir. */
function TipTooltip({
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { styles, title, content } = step;
  return (
    <div
      className="react-joyride__tooltip"
      style={styles.tooltip}
      {...tooltipProps}
      aria-labelledby="joyride-tooltip-title"
      aria-describedby="joyride-tooltip-content"
    >
      <div style={styles.tooltipContainer}>
        <h4 id="joyride-tooltip-title" style={styles.tooltipTitle}>
          {title}
        </h4>
        <div id="joyride-tooltip-content" style={styles.tooltipContent}>
          {content}
        </div>
      </div>
      <div style={styles.tooltipFooter}>
        <div style={styles.tooltipFooterSpacer}>
          <button type="button" style={styles.buttonSkip} {...skipProps} />
        </div>
        <button type="button" style={styles.buttonPrimary} {...primaryProps} />
      </div>
    </div>
  );
}
/**
 * Mostra a dica `tip` (uma por vez). "Entendi" marca só essa como vista; "Dispensar"
 * desliga todas as dicas da fase 1.
 */
export function TipTour({
  tip,
  onSeen,
  onDismissAll,
}: {
  tip: TipId | undefined;
  onSeen: (tip: TipId) => void;
  onDismissAll: () => void;
}) {
  return (
    <Joyride
      key={tip ?? "nenhuma"}
      run={!!tip}
      continuous
      steps={[{ ...TIPS[tip ?? "inicio"], tooltipComponent: TipTooltip }]}
      locale={LOCALE}
      options={{ ...OPTIONS, buttons: ["skip", "primary"] }}
      styles={STYLES}
      onEvent={(data) => {
        if (!tip || !ended(data)) return;
        if (data.status === "skipped") onDismissAll();
        else onSeen(tip);
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
