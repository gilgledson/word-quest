import type { Session } from "../../game/crossword-engine";
import { MT } from "../../i18n/match";

export interface MatchSummary {
  result: "win" | "draw" | "loss";
  scores: { p: number; ai: number };
  /** Letras confirmadas por cada lado (as da Dica contam para quem a usou). */
  letters: { p: number; ai: number };
  /** Casas travadas pela Dica. */
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
    helped: (session.hinted ?? []).filter((k) => session.locked.includes(k))
      .length,
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
      label: MT.medalNoHelp,
      hint: MT.medalNoHelpHint,
    });
  if (margin >= 10)
    medals.push({
      id: "folgada",
      label: MT.medalBig,
      hint: MT.medalBigHint(margin),
    });
  else if (margin <= 3)
    medals.push({
      id: "apertada",
      label: MT.medalClose,
      hint: MT.medalCloseHint,
    });
  const total = s.letters.p + s.letters.ai;
  if (total > 0 && s.letters.p / total >= 0.6)
    medals.push({
      id: "dono",
      label: MT.medalOwner,
      hint: MT.medalOwnerHint,
    });
  return medals;
}
