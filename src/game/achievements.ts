import { levels } from "../data/catalog";
import type { Player } from "../services/repository";
import { wordsFoundCount } from "./chest";
import { OPPONENT_BY_LEVEL, opponentById } from "./opponents";

/**
 * Conquistas: metas lidas do progresso já salvo do jogador. Ao atingir a meta a conquista fica
 * pronta e o jogador resgata as moedas no Perfil (uma vez cada; `Player.achievements` guarda as
 * já resgatadas).
 */
export interface Achievement {
  id: string;
  title: string;
  text: string;
  /** Moedas pagas ao resgatar. */
  coins: number;
  goal: number;
  /** Quanto o jogador já andou rumo à meta. */
  value: (p: Player) => number;
}
export interface AchievementStatus extends Achievement {
  /** Progresso limitado à meta (para a barra). */
  progress: number;
  done: boolean;
  claimed: boolean;
}

const DAY = 86_400_000;
/** Maior sequência de dias seguidos com o Desafio do Dia vencido. */
export function bestDailyStreak(days: string[]) {
  const stamps = [...new Set(days)]
    .map((d) => Date.parse(`${d}T00:00:00Z`))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  stamps.forEach((t, i) => {
    run = i > 0 && t - stamps[i - 1] === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
const wonLevels = (p: Player) => levels.filter((l) => p.stars[l.id]);
/** Rivais da Aventura já vencidos (ids, sem repetir). */
const beatenRivals = (p: Player) => [
  ...new Set(wonLevels(p).map((l) => OPPONENT_BY_LEVEL[l.number])),
];
const beatenBosses = (p: Player) =>
  beatenRivals(p).filter((id) => opponentById(id)?.boss).length;
const BOSSES = new Set(
  Object.values(OPPONENT_BY_LEVEL).filter((id) => opponentById(id)?.boss),
).size;
/** Fases vencidas no mundo em que o jogador mais avançou, e o tamanho desse mundo. */
const worldSize = Math.max(
  ...Object.values(
    levels.reduce<Record<string, number>>(
      (n, l) => ({ ...n, [l.world]: (n[l.world] ?? 0) + 1 }),
      {},
    ),
  ),
);
const bestWorld = (p: Player) =>
  Math.max(
    0,
    ...Object.values(
      wonLevels(p).reduce<Record<string, number>>(
        (n, l) => ({ ...n, [l.world]: (n[l.world] ?? 0) + 1 }),
        {},
      ),
    ),
  );
const duelWins = (p: Player) =>
  Object.values(p.duels).filter((r) => r === "win").length;
const stars = (p: Player) => Object.values(p.stars).reduce((a, b) => a + b, 0);
const words = (p: Player) => wordsFoundCount(p.wordsFound);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primeiro-passo",
    title: "O primeiro passo",
    text: "Vença sua primeira fase.",
    coins: 20,
    goal: 1,
    value: (p) => wonLevels(p).length,
  },
  {
    id: "palavras-25",
    title: "Aprendiz de palavras",
    text: "Descubra 25 palavras.",
    coins: 30,
    goal: 25,
    value: words,
  },
  {
    id: "palavras-100",
    title: "Colecionador",
    text: "Descubra 100 palavras.",
    coins: 60,
    goal: 100,
    value: words,
  },
  {
    id: "palavras-300",
    title: "Dicionário ambulante",
    text: "Descubra 300 palavras.",
    coins: 120,
    goal: 300,
    value: words,
  },
  {
    id: "duelos-5",
    title: "Duelista",
    text: "Vença 5 duelos.",
    coins: 40,
    goal: 5,
    value: duelWins,
  },
  {
    id: "duelos-20",
    title: "Campeão dos duelos",
    text: "Vença 20 duelos.",
    coins: 100,
    goal: 20,
    value: duelWins,
  },
  {
    id: "mao-certeira",
    title: "Mão certeira",
    text: "Vença um duelo sem errar nenhuma letra.",
    coins: 40,
    goal: 1,
    value: (p) => p.cleanWins ?? 0,
  },
  {
    id: "chefe",
    title: "Caça-chefes",
    text: "Vença o chefe de um mundo.",
    coins: 50,
    goal: 1,
    value: beatenBosses,
  },
  {
    id: "chefes-todos",
    title: "Lenda dos cinco mundos",
    text: `Vença os ${BOSSES} chefes.`,
    coins: 150,
    goal: BOSSES,
    value: beatenBosses,
  },
  {
    id: "mundo-completo",
    title: "Mundo completo",
    text: "Vença todas as fases de um mundo.",
    coins: 60,
    goal: worldSize,
    value: bestWorld,
  },
  {
    id: "rivais-6",
    title: "Sem medo de ninguém",
    text: "Vença 6 rivais diferentes na Aventura.",
    coins: 60,
    goal: 6,
    value: (p) => beatenRivals(p).length,
  },
  {
    id: "estrelas-30",
    title: "Céu estrelado",
    text: "Junte 30 estrelas.",
    coins: 80,
    goal: 30,
    value: stars,
  },
  {
    id: "diario-1",
    title: "Ritual do dia",
    text: "Vença um Desafio do Dia.",
    coins: 20,
    goal: 1,
    value: (p) => p.daily.length,
  },
  {
    id: "diario-7",
    title: "Semana perfeita",
    text: "Vença o Desafio do Dia 7 dias seguidos.",
    coins: 100,
    goal: 7,
    value: (p) => bestDailyStreak(p.daily),
  },
];

/** Situação de cada conquista para este jogador, na ordem do catálogo. */
export function achievementStatus(p: Player): AchievementStatus[] {
  const claimed = new Set(p.achievements ?? []);
  return ACHIEVEMENTS.map((a) => {
    const progress = Math.min(a.goal, a.value(p));
    return {
      ...a,
      progress,
      done: progress >= a.goal,
      claimed: claimed.has(a.id),
    };
  });
}
/** Ids das conquistas com a meta já atingida (resgatadas ou não). */
export const achievedIds = (p: Player) =>
  achievementStatus(p)
    .filter((a) => a.done)
    .map((a) => a.id);
/** Quantas conquistas esperam o resgate. */
export const claimableCount = (p: Player) =>
  achievementStatus(p).filter((a) => a.done && !a.claimed).length;
/** Resgata a conquista: paga as moedas uma vez só, e só com a meta atingida. */
export function claimAchievement(p: Player, id: string): Player {
  const a = achievementStatus(p).find((s) => s.id === id);
  if (!a || !a.done || a.claimed) return p;
  return {
    ...p,
    coins: p.coins + a.coins,
    achievements: [...(p.achievements ?? []), id],
  };
}
