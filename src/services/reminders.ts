/**
 * Lembrete diário (notificação local, sem servidor): uma vez por dia, no fim da tarde, avisa do
 * Desafio do Dia e da recompensa por voltar. Só no app Android; no navegador nada acontece.
 *
 * Os próximos 7 dias ficam agendados de uma vez e são refeitos a cada abertura do app, então os
 * textos acompanham o progresso (dia da recompensa, sequência do diário) e quem para de abrir
 * recebe no máximo 7 lembretes.
 */
import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";
import {
  LOGIN_REWARDS,
  rewardOf,
  type LoginRewardState,
} from "../game/loginReward";
import { track } from "./telemetry";
import { reminderText } from "../i18n/game";

/** Ids fixos: cancelar e reagendar não acumula notificações velhas. */
const IDS = [7101, 7102, 7103, 7104, 7105, 7106, 7107];
export const REMINDER_HOUR = 18;
export const REMINDER_MINUTE = 30;

export interface ReminderPlayer {
  reminders?: boolean;
  loginReward?: LoginRewardState;
  /** Dias (AAAA-MM-DD) em que o Desafio do Dia foi vencido. */
  daily: string[];
  /** Sequência atual do Desafio do Dia. */
  streak: number;
}

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
/** 18:30 no relógio do aparelho, no dia dado. */
const at = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, REMINDER_HOUR, REMINDER_MINUTE);
};

/**
 * Os lembretes dos próximos 7 dias (puro, para testar). Hoje entra só se ainda não passou das 18:30
 * e se ainda há o que fazer hoje (recompensa ou desafio do dia); os outros dias contam que o
 * jogador volte todo dia (a recompensa avança um dia por vez).
 */
export function reminderPlan(
  p: ReminderPlayer,
  today: string,
  now: Date,
): LocalNotificationSchema[] {
  const reward = rewardOf(p.loginReward, today);
  const doneToday = reward.claimed && p.daily.includes(today);
  const plan: LocalNotificationSchema[] = [];
  for (let i = 0; i < IDS.length; i++) {
    const date = shift(today, i);
    const when = at(date);
    if (i === 0 && (when <= now || doneToday)) continue;
    // Dia do ciclo da recompensa nessa data, se o jogador for pegando todo dia (hoje é `reward.day`).
    const day = ((reward.day - 1 + i) % LOGIN_REWARDS.length) + 1;
    const coins = LOGIN_REWARDS[day - 1];
    const streak = i === 0 ? p.streak : 0;
    const body =
      day === LOGIN_REWARDS.length
        ? reminderText.day7(coins)
        : streak >= 2
          ? reminderText.streak(streak, coins)
          : reminderText.plain(coins);
    plan.push({
      id: IDS[i],
      title: reminderText.title,
      body,
      schedule: { at: when, allowWhileIdle: true },
      extra: { route: "/" },
    });
  }
  return plan;
}

export const remindersSupported = () =>
  Capacitor.isNativePlatform() &&
  Capacitor.isPluginAvailable("LocalNotifications");

/** O Android já deixa mostrar notificações (Android 13+ pergunta ao jogador). */
export async function remindersAllowed() {
  if (!remindersSupported()) return false;
  try {
    return (await LocalNotifications.checkPermissions()).display === "granted";
  } catch {
    return false;
  }
}

/** Pede a permissão do sistema; devolve se o jogador deixou. */
export async function askReminderPermission() {
  if (!remindersSupported()) return false;
  try {
    const granted =
      (await LocalNotifications.requestPermissions()).display === "granted";
    track("reminder_permission", { granted });
    return granted;
  } catch {
    return false;
  }
}

/** Refaz os lembretes conforme o jogador está agora (ou cancela, se ele desligou). */
export async function syncReminders(p: ReminderPlayer, today: string) {
  if (!remindersSupported()) return;
  try {
    await LocalNotifications.cancel({
      notifications: IDS.map((id) => ({ id })),
    });
    if (p.reminders !== true || !(await remindersAllowed())) return;
    const notifications = reminderPlan(p, today, new Date());
    if (notifications.length)
      await LocalNotifications.schedule({ notifications });
  } catch {
    /* Lembrete é opcional: falha no agendamento nunca chega ao jogador. */
  }
}

/** Tocar no lembrete abre o jogo na tela certa (a inicial, onde está a recompensa). */
export function followReminderTaps(go: (route: string) => void) {
  if (!remindersSupported()) return () => {};
  let stop: (() => void) | undefined;
  void LocalNotifications.addListener(
    "localNotificationActionPerformed",
    ({ notification }) => {
      track("reminder_opened", { day: new Date().getDay() });
      go(String(notification.extra?.route ?? "/"));
    },
  )
    .then((h) => (stop = () => void h.remove()))
    .catch(() => {});
  return () => stop?.();
}
