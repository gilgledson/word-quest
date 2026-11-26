/**
 * Funil da primeira experiência (medição): marcos que vão para o Analytics uma vez só por jogador,
 * na primeira vez que acontecem — a primeira jogada, a primeira palavra fechada, a primeira vez que
 * o rival joga e como termina (ou é abandonado) o primeiro duelo. Assim dá para ver onde quem
 * instalou o jogo para antes de chegar ao fim do primeiro duelo.
 */
export type Milestone =
  | "first_move"
  | "first_word"
  | "first_rival_turn"
  | "first_duel_end"
  | "first_duel_quit";

type WithMilestones = { milestones?: string[] };

/** O jogador já passou por este marco (e ele já foi medido). */
export const reached = (p: WithMilestones, m: Milestone) =>
  !!p.milestones?.includes(m);

/** O jogador com o marco anotado (sem repetir). */
export const withMilestone = <P extends WithMilestones>(
  p: P,
  m: Milestone,
): P =>
  reached(p, m) ? p : { ...p, milestones: [...(p.milestones ?? []), m] };

/** Nome do modo da partida nos eventos. */
export const duelMode = (m: {
  online?: boolean;
  /** Procura de oponente em que ninguém chegou (o rival do jogo assumiu). */
  bot?: boolean;
  daily?: boolean;
  casual?: boolean;
}) =>
  m.online
    ? m.bot
      ? "online_bot"
      : "online"
    : m.daily
      ? "diario"
      : m.casual
        ? "casual"
        : "aventura";
