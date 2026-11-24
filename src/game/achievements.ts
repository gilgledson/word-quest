import { levels } from "../data/catalog";
import type { Player } from "../services/repository";
import { wordsFoundCount } from "./chest";
import { OPPONENT_BY_LEVEL, opponentById } from "./opponents";
import { gameText } from "../i18n/game";

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
/** Chefes da Aventura (lido na hora: o conteúdo baixado pode trazer mundos novos). */
const bosses = () =>
  new Set(
    Object.values(OPPONENT_BY_LEVEL).filter((id) => opponentById(id)?.boss),
  ).size;
/** Fases vencidas no mundo em que o jogador mais avançou, e o tamanho desse mundo. */
const worldSize = () =>
  Math.max(
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

type Named = keyof typeof gameText.achievements;
/** Nome e descrição lidos no idioma em uso a cada acesso (enumeráveis: o `...a` os copia). */
const named = (
  a: Omit<Achievement, "title" | "text"> & { id: Named },
): Achievement =>
  Object.defineProperties(a, {
    title: { get: () => gameText.achievements[a.id].title, enumerable: true },
    text: { get: () => gameText.achievements[a.id].text, enumerable: true },
  }) as Achievement;

export const ACHIEVEMENTS: Achievement[] = [
  named({
    id: "primeiro-passo",
    coins: 20,
    goal: 1,
    value: (p) => wonLevels(p).length,
  }),
  named({
    id: "palavras-25",
    coins: 30,
    goal: 25,
    value: words,
  }),
  named({
    id: "palavras-100",
    coins: 60,
    goal: 100,
    value: words,
  }),
  named({
    id: "palavras-300",
    coins: 120,
    goal: 300,
    value: words,
  }),
  named({
    id: "duelos-5",
    coins: 40,
    goal: 5,
    value: duelWins,
  }),
  named({
    id: "duelos-20",
    coins: 100,
    goal: 20,
    value: duelWins,
  }),
  named({
    id: "mao-certeira",
    coins: 40,
    goal: 1,
    value: (p) => p.cleanWins ?? 0,
  }),
  named({
    id: "chefe",
    coins: 50,
    goal: 1,
    value: beatenBosses,
  }),
  {
    id: "chefes-todos",
    get title() {
      return gameText.allBossesTitle;
    },
    get text() {
      return gameText.allBossesText(bosses());
    },
    coins: 150,
    get goal() {
      return bosses();
    },
    value: beatenBosses,
  },
  named({
    id: "mundo-completo",
    coins: 60,
    get goal() {
      return worldSize();
    },
    value: bestWorld,
  }),
  named({
    id: "rivais-6",
    coins: 60,
    goal: 6,
    value: (p) => beatenRivals(p).length,
  }),
  named({
    id: "estrelas-30",
    coins: 80,
    goal: 30,
    value: stars,
  }),
  named({
    id: "diario-1",
    coins: 20,
    goal: 1,
    value: (p) => p.daily.length,
  }),
  named({
    id: "diario-7",
    coins: 100,
    goal: 7,
    value: (p) => bestDailyStreak(p.daily),
  }),
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
