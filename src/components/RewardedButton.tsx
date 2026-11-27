import { useEffect, useRef, type ReactNode } from "react";
import { Clapperboard } from "lucide-react";
import { today } from "../data/catalog";
import {
  alreadyDoubled,
  videosLeft,
  type RewardedPlace,
} from "../game/rewarded";
import { usePlayer } from "../stores/player";
import {
  canOffer,
  startRewarded,
  useRewarded,
  watchRewarded,
  type AdOutcome,
} from "../services/rewardedAds";
import { track } from "../services/telemetry";
import { rewardedT as t } from "../i18n/screens";

interface Props {
  place: RewardedPlace;
  coins: number;
  /** Fim do duelo: a partida cujas moedas o vídeo dobra (uma vez por partida). */
  doubleKey?: string;
  label: string;
  ariaLabel?: string;
  /** Texto enquanto o vídeo abre (padrão: "Abrindo o vídeo…"). */
  busyLabel?: string;
  className?: string;
  /** Ícone antes do texto (padrão: a claquete). */
  icon?: ReactNode;
  onResult?: (o: AdOutcome, coins: number) => void;
}

/**
 * Botão "assistir vídeo" do vídeo premiado. Some sozinho com a opção desligada, sem vídeo carregado,
 * com o limite do dia alcançado ou com a partida já dobrada. Nunca aparece durante a vez nem no
 * tutorial: só é posto na tela inicial, na loja e no resultado do duelo.
 */
export function RewardedButton({
  place,
  coins,
  doubleKey,
  label,
  ariaLabel,
  busyLabel = t.loading,
  className = "button rewarded-button",
  icon = <Clapperboard size={18} aria-hidden="true" />,
  onResult,
}: Props) {
  const state = usePlayer((s) => s.player.rewarded);
  const { ready, busy } = useRewarded();
  const day = today();
  const left = videosLeft(state, day);
  const doubled = !!doubleKey && alreadyDoubled(state, day, doubleKey);
  const visible = !doubled && (busy || canOffer(ready, left));
  useEffect(() => void startRewarded(), []);
  const shown = useRef(false);
  useEffect(() => {
    if (!visible || shown.current) return;
    shown.current = true;
    track("rewarded_offer_shown", { place });
  }, [visible, place]);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      aria-label={busy ? t.loading : ariaLabel}
      onClick={async () => {
        const o = await watchRewarded(place, coins, doubleKey);
        onResult?.(o, coins);
      }}
    >
      {icon}
      {busy ? busyLabel : label}
    </button>
  );
}

/** Mensagem para o jogador depois do vídeo (vazia quando não há o que dizer). */
export const rewardedMessage = (o: AdOutcome, coins: number) =>
  o.earned
    ? t.earned(coins)
    : o.reason === "closed_early"
      ? t.closedEarly
      : o.reason === "busy"
        ? ""
        : t.failed;
