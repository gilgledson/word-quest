import { useState } from "react";
import { ChestReward } from "../components/ChestReward";
import { chestPrize, chestsReady, wordsToNextChest } from "../game/chest";
import { levels } from "../data/catalog";
import { askReviewIfGood } from "../services/review";
import { usePlayer } from "../stores/player";
import { playSfx } from "../services/sound";
import { buzz } from "../services/haptics";
import { homeT as t } from "../i18n/screens";

/** Texto curto sobre o próximo baú (vira o aviso "Baú pronto!" quando há um para abrir). */
export function ChestHint({ words }: { words: number }) {
  const opened = usePlayer((s) => s.player.chestsOpened ?? 0);
  const ready = chestsReady(words, opened);
  const left = wordsToNextChest(words, opened);
  return (
    <span className={`chest-hint ${ready ? "ready" : ""}`}>
      {ready
        ? ready > 1
          ? t.chestsReady(ready)
          : t.chestReady
        : t.chestIn(left)}
    </span>
  );
}

/**
 * Baú do fim da barra de progresso: a cada 25 palavras descobertas um baú fica pronto; ao tocar nele as moedas
 * entram no saldo e a abertura aparece numa janela.
 */
export function HomeChest({ words }: { words: number }) {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const [prize, setPrize] = useState<number | null>(null);
  const opened = player.chestsOpened ?? 0;
  const ready = chestsReady(words, opened);
  const open = () => {
    if (!ready) return;
    const coins = chestPrize(opened);
    update((p) =>
      // Confere de novo dentro da atualização: dois toques seguidos não pagam duas vezes.
      chestsReady(words, p.chestsOpened ?? 0) > 0
        ? {
            ...p,
            coins: p.coins + chestPrize(p.chestsOpened ?? 0),
            chestsOpened: (p.chestsOpened ?? 0) + 1,
          }
        : p,
    );
    playSfx(player.sound, "win");
    buzz(player.vibration, "win");
    setPrize(coins);
  };
  // Ao fechar a janela do baú (momento feliz), pede a nota na loja se for a hora (ver review.ts).
  const close = () => {
    setPrize(null);
    const p = usePlayer.getState().player;
    const wins = levels.filter((l) => p.stars[l.id]).length;
    askReviewIfGood(
      p,
      wins,
      (reviewAsks) => update((q) => ({ ...q, reviewAsks })),
      "chest",
    );
  };
  return (
    <>
      <button
        type="button"
        className={`journey-chest game-art art-chest ${ready ? "ready" : ""}`}
        disabled={!ready}
        onClick={open}
        aria-label={ready ? t.openChest(chestPrize(opened)) : t.chestClosed}
      >
        {ready > 1 && <b className="chest-count">{ready}</b>}
      </button>
      {prize !== null && (
        <div
          className="swap-backdrop chest-backdrop"
          onClick={close}
          onKeyDown={(e) => e.key === "Escape" && close()}
        >
          <div
            className="swap-dialog chest-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t.chestOpened}
            onClick={(e) => e.stopPropagation()}
          >
            <ChestReward coins={prize} animated={player.animations} />
            <button
              type="button"
              className="button primary"
              autoFocus
              onClick={close}
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
