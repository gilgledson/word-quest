/**
 * Recompensa por voltar: um prêmio em moedas por dia em que o jogador abre o jogo, crescente ao
 * longo de 7 dias seguidos. Pular um dia volta ao dia 1; depois do 7º o ciclo recomeça. As datas
 * são as do jogo (`today()`, fuso de São Paulo), no formato AAAA-MM-DD.
 */
export const LOGIN_REWARDS = [20, 30, 40, 50, 60, 80, 150] as const;

export interface LoginRewardState {
  /** Último dia em que a recompensa foi pega. */
  last: string;
  /** Dia do ciclo pego nessa data (1 a 7). */
  day: number;
}

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** A recompensa de hoje: qual dia do ciclo, quantas moedas e se já foi pega. */
export function rewardOf(state: LoginRewardState | undefined, today: string) {
  if (state?.last === today)
    return {
      day: state.day,
      coins: LOGIN_REWARDS[state.day - 1],
      claimed: true,
    };
  const day =
    state && state.last === shift(today, -1)
      ? (state.day % LOGIN_REWARDS.length) + 1
      : 1;
  return { day, coins: LOGIN_REWARDS[day - 1], claimed: false };
}

/** O que amanhã rende, se o jogador voltar (o dia seguinte ao de hoje no ciclo). */
export function tomorrowCoins(
  state: LoginRewardState | undefined,
  today: string,
) {
  const { day } = rewardOf(state, today);
  return LOGIN_REWARDS[day % LOGIN_REWARDS.length];
}

/**
 * Pega a recompensa de hoje: soma as moedas e marca o dia. Pegar de novo no mesmo dia não muda nada
 * (dois toques seguidos não pagam duas vezes).
 */
export function claimReward<
  P extends { coins: number; loginReward?: LoginRewardState },
>(p: P, today: string): P {
  const r = rewardOf(p.loginReward, today);
  if (r.claimed) return p;
  return {
    ...p,
    coins: p.coins + r.coins,
    loginReward: { last: today, day: r.day },
  };
}
