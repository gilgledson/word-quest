import { useState } from "react";
import { BellRing, Check, Lock } from "lucide-react";
import { motion } from "motion/react";
import { CoinIcon } from "../components/CoinIcon";
import { today } from "../data/catalog";
import {
  claimReward,
  LOGIN_REWARDS,
  rewardOf,
  tomorrowCoins,
} from "../game/loginReward";
import { usePlayer } from "../stores/player";
import { playSfx } from "../services/sound";
import { buzz } from "../services/haptics";
import { track } from "../services/telemetry";
import {
  askReminderPermission,
  remindersSupported,
} from "../services/reminders";

type Stage = "reward" | "reminder" | null;

/**
 * Recompensa por voltar, na tela inicial: na primeira abertura do dia (depois do tutorial) a
 * janela mostra os 7 dias e o prêmio de hoje. Ao pegar, no app Android, quem nunca respondeu é
 * convidado a ligar o lembrete diário (antes do pedido de permissão do sistema).
 */
export function DailyRewardFlow() {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const date = today();
  const reward = rewardOf(player.loginReward, date);
  const [stage, setStage] = useState<Stage>(() =>
    player.tutorialDone && !reward.claimed ? "reward" : null,
  );
  const animated = player.animations;
  const claim = () => {
    update((p) => claimReward(p, date));
    playSfx(player.sound, "win");
    buzz(player.vibration, "win");
    track("daily_reward_claimed", { day: reward.day, coins: reward.coins });
    setStage(
      remindersSupported() && player.reminders === undefined
        ? "reminder"
        : null,
    );
  };
  const answer = async (wants: boolean) => {
    const granted = wants ? await askReminderPermission() : false;
    update((p) => ({ ...p, reminders: granted }));
    if (!wants) track("reminder_declined");
    setStage(null);
  };
  if (!stage) return null;
  return (
    <div className="swap-backdrop result-backdrop daily-backdrop">
      {stage === "reward" ? (
        <motion.div
          className="swap-dialog result-dialog daily-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Recompensa diária"
          initial={animated ? { opacity: 0, scale: 0.85, y: 16 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        >
          <span className="result-rays" aria-hidden="true" />
          <span
            className="game-art art-calendar daily-art"
            aria-hidden="true"
          />
          <h2>Recompensa diária</h2>
          <p className="daily-sub">Volte todo dia e ganhe mais moedas</p>
          <ol className="daily-days">
            {LOGIN_REWARDS.map((coins, i) => {
              const day = i + 1;
              const state =
                day < reward.day
                  ? "got"
                  : day === reward.day
                    ? "today"
                    : "locked";
              const last = day === LOGIN_REWARDS.length;
              return (
                <li
                  key={day}
                  className={`daily-day ${state} ${last ? "big" : ""}`}
                  aria-label={`Dia ${day}: ${coins} moedas${
                    state === "got"
                      ? ", já pego"
                      : state === "today"
                        ? ", hoje"
                        : ""
                  }`}
                >
                  <span className="daily-day-name">Dia {day}</span>
                  {last ? (
                    <span className="game-art art-chest daily-chest" />
                  ) : (
                    <span className="daily-coins-art">
                      <CoinIcon size={22} />
                      <CoinIcon size={22} />
                    </span>
                  )}
                  <b>{coins}</b>
                  {state === "got" && (
                    <span className="daily-mark got" aria-hidden="true">
                      <Check size={14} strokeWidth={3.5} />
                    </span>
                  )}
                  {state === "locked" && (
                    <span className="daily-mark locked" aria-hidden="true">
                      <Lock size={12} strokeWidth={3} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className="button primary daily-claim"
            autoFocus
            onClick={claim}
          >
            Pegar +{reward.coins} moedas
          </button>
          <p className="daily-next">
            Amanhã: +{tomorrowCoins(player.loginReward, date)} moedas
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="swap-dialog result-dialog reminder-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Lembrete diário"
          initial={animated ? { opacity: 0, scale: 0.85, y: 16 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        >
          <span className="result-rays" aria-hidden="true" />
          <span className="reminder-bell" aria-hidden="true">
            <BellRing size={40} strokeWidth={2.2} />
          </span>
          <h2>Quer um lembrete?</h2>
          <p className="daily-sub">
            Avisamos uma vez por dia, no fim da tarde, quando o desafio do dia
            chegar e sua recompensa estiver pronta.
          </p>
          <button
            type="button"
            className="button primary daily-claim"
            autoFocus
            onClick={() => void answer(true)}
          >
            Sim, me avise
          </button>
          <button
            type="button"
            className="reminder-later"
            onClick={() => void answer(false)}
          >
            Agora não
          </button>
        </motion.div>
      )}
    </div>
  );
}
