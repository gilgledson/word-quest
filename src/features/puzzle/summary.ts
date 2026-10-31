import type { Session } from "../../game/crossword-engine";

export interface MatchSummary {
  result: "win" | "draw" | "loss";
  scores: { p: number; ai: number };
  /** Letras confirmadas por cada lado (casas reveladas por Dica não contam). */
  letters: { p: number; ai: number };
  /** Casas reveladas por Dica, sem dono. */
  helped: number;
}
export interface Medal {
  id: string;
  label: string;
  hint: string;
}
/** Resumo da partida lido só da sessão: quem confirmou o quê e como terminou. */
export function summarize(session: Session): MatchSummary {
  const { p, ai } = session.scores;
  const owners = Object.entries(session.owners).filter(([k]) =>
    session.locked.includes(k),
  );
  const letters = {
    p: owners.filter(([, o]) => o === "p").length,
    ai: owners.filter(([, o]) => o === "ai").length,
  };
  return {
    result: p > ai ? "win" : p === ai ? "draw" : "loss",
    scores: { p, ai },
    letters,
    helped: session.locked.length - letters.p - letters.ai,
  };
}
/** Medalhas ganhas nesta partida (só vitórias rendem medalha). */
export function medalsFor(s: MatchSummary): Medal[] {
  if (s.result !== "win") return [];
  const margin = s.scores.p - s.scores.ai;
  const medals: Medal[] = [];
  if (s.helped === 0)
    medals.push({
      id: "sem-ajuda",
      label: "Sem ajuda",
      hint: "Venceu sem usar a Dica",
    });
  if (margin >= 10)
    medals.push({
      id: "folgada",
      label: "Vitória folgada",
      hint: `${margin} pontos de vantagem`,
    });
  else if (margin <= 3)
    medals.push({
      id: "apertada",
      label: "No sufoco",
      hint: "Venceu por poucos pontos",
    });
  const total = s.letters.p + s.letters.ai;
  if (total > 0 && s.letters.p / total >= 0.6)
    medals.push({
      id: "dono",
      label: "Dono da grade",
      hint: "Confirmou a maior parte das letras",
    });
  return medals;
}
