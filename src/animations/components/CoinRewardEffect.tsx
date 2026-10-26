import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { ANIMATION_COLORS, GAME_ANIMATIONS } from "../animation.config";
import type { Rect } from "../animation.types";
import { measureElement } from "../utils/animationGeometry";
import { COIN_COUNT, COIN_STAGGER } from "../hooks/useGameAnimations";

interface Props {
  container: HTMLElement | null;
  amount: number;
  reduced: boolean;
}

/**
 * Moedas douradas que saem do painel de resultado e voam até o contador do cabeçalho, com um
 * pulso no saldo e um "+N" ao lado. O saldo real já foi atualizado pelo estado do jogo; isto é só
 * a animação (e como nasce de um evento com id próprio, nunca é reproduzida de novo).
 */
export function CoinRewardEffect({ container, amount, reduced }: Props) {
  const [geo, setGeo] = useState<{
    from: { x: number; y: number };
    wallet: Rect;
  } | null>(null);
  useLayoutEffect(() => {
    if (!container) return;
    const wallet = document.querySelector(".wallet");
    if (!wallet) return;
    const source =
      container.querySelector(".result-dialog") ??
      container.querySelector(".victory") ??
      container.querySelector(".board-card");
    const base = source
      ? measureElement(container, source)
      : measureElement(container, container);
    setGeo({
      from: { x: base.x + base.w / 2, y: base.y + base.h / 2 },
      wallet: measureElement(container, wallet),
    });
  }, [container]);
  // Pulso no saldo enquanto as moedas chegam (classe no próprio contador, removida ao fim).
  useEffect(() => {
    if (reduced) return;
    const wallet = document.querySelector(".wallet");
    const total = GAME_ANIMATIONS.coinReward + COIN_STAGGER * (COIN_COUNT - 1);
    const timer = setTimeout(
      () => wallet?.classList.add("fx-wallet-pulse"),
      GAME_ANIMATIONS.coinReward * 0.6,
    );
    const off = setTimeout(
      () => wallet?.classList.remove("fx-wallet-pulse"),
      total + 300,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(off);
      wallet?.classList.remove("fx-wallet-pulse");
    };
  }, [reduced]);
  if (!geo) return null;
  const target = {
    x: geo.wallet.x + geo.wallet.w * 0.75,
    y: geo.wallet.y + geo.wallet.h / 2,
  };
  return (
    <>
      {!reduced &&
        Array.from({ length: COIN_COUNT }, (_, i) => (
          <span
            key={i}
            className="fx-coin"
            data-testid="fx-coin"
            aria-hidden="true"
            style={
              {
                left: geo.from.x + (i - (COIN_COUNT - 1) / 2) * 6,
                top: geo.from.y,
                "--tx": `${target.x - geo.from.x}px`,
                "--ty": `${target.y - geo.from.y}px`,
                "--fx-delay": `${i * COIN_STAGGER}ms`,
                "--fx-total": `${GAME_ANIMATIONS.coinReward}ms`,
                "--fx-gold": ANIMATION_COLORS.gold,
              } as CSSProperties
            }
          />
        ))}
      <span
        className={`fx-coin-amount ${reduced ? "reduced" : ""}`}
        data-testid="fx-coin-amount"
        aria-hidden="true"
        style={
          {
            left: geo.wallet.x + geo.wallet.w / 2,
            top: geo.wallet.y + geo.wallet.h + 4,
            "--fx-total": `${GAME_ANIMATIONS.coinReward + 500}ms`,
          } as CSSProperties
        }
      >
        +{amount}
      </span>
    </>
  );
}
