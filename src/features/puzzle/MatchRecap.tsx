import { opponentById } from "../../game/opponents";
import type { GameRecord } from "../../services/repository";
import { medalsFor, type MatchSummary } from "./summary";

interface Props {
  rivalName: string;
  summary: MatchSummary;
  /** Partidas concluídas, a mais recente primeiro (a atual já vem incluída). */
  history: GameRecord[];
}
/** Resumo da partida, medalhas e últimas partidas, mostrados na janela de resultado. */
export function MatchRecap({ rivalName, summary, history }: Props) {
  const medals = medalsFor(summary);
  return (
    <>
      <dl className="match-stats" aria-label="Resumo da partida">
        <div>
          <dt>Suas letras</dt>
          <dd>{summary.letters.p}</dd>
        </div>
        <div>
          <dt>Letras de {rivalName}</dt>
          <dd>{summary.letters.ai}</dd>
        </div>
        <div>
          <dt>Pela Dica</dt>
          <dd>{summary.helped}</dd>
        </div>
      </dl>
      {medals.length > 0 && (
        <ul className="medals" aria-label="Medalhas desta partida">
          {medals.map((m) => (
            <li key={m.id} title={m.hint}>
              <b>
                <span aria-hidden="true">🏅</span> {m.label}
              </b>
              <small>{m.hint}</small>
            </li>
          ))}
        </ul>
      )}
      {history.length > 1 && (
        <details className="match-history">
          <summary>Últimas partidas</summary>
          <ol>
            {history.slice(0, 5).map((g, i) => (
              <li key={`${g.date}-${i}`} data-result={g.result}>
                <b>
                  {g.result === "win"
                    ? "Vitória"
                    : g.result === "draw"
                      ? "Empate"
                      : "Derrota"}
                </b>{" "}
                {g.p} × {g.ai}
                {" · "}
                {opponentById(g.opponent)?.name ?? "Oponente"}
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}
