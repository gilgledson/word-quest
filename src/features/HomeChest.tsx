import { useState } from "react";
import { ChestReward } from "../components/ChestReward";
import { chestPrize, chestsReady, winsToNextChest } from "../game/chest";
import { usePlayer } from "../stores/player";
import { playSfx } from "../services/sound";
import { buzz } from "../services/haptics";

/** Texto curto sobre o próximo baú (vira o aviso "Baú pronto!" quando há um para abrir). */
export function ChestHint({ wins }: { wins: number }) {
  const opened = usePlayer((s) => s.player.chestsOpened ?? 0);
  const ready = chestsReady(wins, opened);
  const left = winsToNextChest(wins, opened);
  return (
    <span className={`chest-hint ${ready ? "ready" : ""}`}>
      {ready
        ? ready > 1
          ? `${ready} baús prontos!`
          : "Baú pronto! Toque nele"
        : left === null
          ? "Todos os baús abertos"
          : `Baú em ${left} ${left === 1 ? "vitória" : "vitórias"}`}
    </span>
  );
}

/**
 * Baú do fim da barra de progresso: a cada 5 vitórias um baú fica pronto; ao tocar nele as moedas
 * entram no saldo e a abertura aparece numa janela.
 */
export function HomeChest({ wins }: { wins: number }) {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const [prize, setPrize] = useState<number | null>(null);
  const opened = player.chestsOpened ?? 0;
  const ready = chestsReady(wins, opened);
  const open = () => {
    if (!ready) return;
    const coins = chestPrize(opened);
    update((p) =>
      // Confere de novo dentro da atualização: dois toques seguidos não pagam duas vezes.
      chestsReady(wins, p.chestsOpened ?? 0) > 0
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
  return (
    <>
      <button
        type="button"
        className={`journey-chest game-art art-chest ${ready ? "ready" : ""}`}
        disabled={!ready}
        onClick={open}
        aria-label={
          ready
            ? `Abrir baú: ${chestPrize(opened)} moedas`
            : "Baú fechado: vença mais fases para abrir"
        }
      >
        {ready > 1 && <b className="chest-count">{ready}</b>}
      </button>
      {prize !== null && (
        <div
          className="swap-backdrop chest-backdrop"
          onClick={() => setPrize(null)}
          onKeyDown={(e) => e.key === "Escape" && setPrize(null)}
        >
          <div
            className="swap-dialog chest-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Baú aberto"
            onClick={(e) => e.stopPropagation()}
          >
            <ChestReward coins={prize} animated={player.animations} />
            <button
              type="button"
              className="button primary"
              autoFocus
              onClick={() => setPrize(null)}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
