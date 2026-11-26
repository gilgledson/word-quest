/**
 * Vídeo premiado (opcional): o jogador escolhe assistir a um vídeo e ganha moedas para a loja.
 * Regra pura: quantos vídeos ainda valem hoje e quanto cada um paga. O limite volta a zero no dia
 * seguinte, pela mesma data do jogo da recompensa diária (`today()`, AAAA-MM-DD).
 *
 * As moedas só entram quando o anúncio confirma a recompensa (vídeo assistido até o fim); um vídeo
 * fechado antes não paga nem conta no limite (ver `services/rewardedAds`).
 */
export const REWARDED = {
  /** Moedas por vídeo na loja. */
  coins: 30,
  /** Vídeos premiados por dia (loja e fim do duelo, somados). */
  maxPerDay: 5,
} as const;

/** Onde o botão apareceu: card da loja, atalho de quem não tem moedas, fim do duelo. */
export type RewardedPlace = "shop" | "shop_short" | "duel_end";

export interface RewardedState {
  /** Dia (AAAA-MM-DD) da contagem abaixo. */
  date: string;
  /** Vídeos premiados que pagaram nesse dia. */
  count: number;
  /** Partidas (chave da sessão) cujas moedas já foram dobradas nesse dia. */
  doubled?: string[];
}

/** Vídeos usados hoje (de outro dia não conta). */
export const usedToday = (s: RewardedState | undefined, today: string) =>
  s?.date === today ? s.count : 0;

/** Quantos vídeos ainda pagam hoje. */
export const videosLeft = (s: RewardedState | undefined, today: string) =>
  Math.max(0, REWARDED.maxPerDay - usedToday(s, today));

/** A partida já teve as moedas dobradas hoje. */
export const alreadyDoubled = (
  s: RewardedState | undefined,
  today: string,
  key: string,
) => s?.date === today && !!s.doubled?.includes(key);

/**
 * Credita um vídeo assistido até o fim: soma `coins` e conta no limite do dia. Sem vídeo restante
 * hoje (ou com moedas inválidas), nada muda. Com `doubleKey`, marca a partida como dobrada (e uma
 * partida já dobrada não paga de novo).
 */
export function creditVideo<
  P extends { coins: number; rewarded?: RewardedState },
>(p: P, today: string, coins: number = REWARDED.coins, doubleKey?: string): P {
  if (!(coins > 0) || videosLeft(p.rewarded, today) <= 0) return p;
  if (doubleKey && alreadyDoubled(p.rewarded, today, doubleKey)) return p;
  const same = p.rewarded?.date === today;
  const doubled = same ? (p.rewarded?.doubled ?? []) : [];
  return {
    ...p,
    coins: p.coins + Math.floor(coins),
    rewarded: {
      date: today,
      count: usedToday(p.rewarded, today) + 1,
      ...(doubleKey || doubled.length
        ? { doubled: doubleKey ? [...doubled, doubleKey] : doubled }
        : {}),
    },
  };
}

/**
 * Junta a contagem do aparelho com a da nuvem: vale o dia mais recente e, no mesmo dia, o maior
 * número (trocar de aparelho não devolve vídeos ao limite).
 */
export function mergeRewarded(
  local: RewardedState | undefined,
  cloud: Pick<RewardedState, "date" | "count"> | undefined,
): RewardedState | undefined {
  if (!cloud) return local;
  if (!local || cloud.date > local.date)
    return { date: cloud.date, count: cloud.count };
  if (cloud.date < local.date) return local;
  return { ...local, count: Math.max(local.count, cloud.count) };
}
