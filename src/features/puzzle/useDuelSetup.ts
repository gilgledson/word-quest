import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  levels,
  casualPuzzles,
  casualThemes,
  dailyPuzzle,
  mapOf,
  today,
} from "../../data/catalog";
import {
  PuzzleEngine,
  type BotLevel,
  type Session,
} from "../../game/crossword-engine";
import { opponentFor } from "../../game/opponents";
import { usePlayer } from "../../stores/player";

/** Descobre qual grade e qual oponente a rota pede e retoma (ou cria) a sessão do duelo. */
export function useDuelSetup() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { player } = usePlayer();
  const daily = id === "daily";
  const date = today();
  const casual = !daily && !!id?.startsWith("casual-");
  const puzzle = daily
    ? dailyPuzzle(date)
    : casual
      ? casualPuzzles.find((p) => p.id === id)
      : levels.find((p) => p.id === id);
  const backTo = daily
    ? "/daily"
    : casual
      ? "/casual"
      : mapOf(puzzle?.world).path;
  const theme = casual
    ? casualThemes.find((t) => t.puzzles.some((p) => p.id === puzzle?.id))
    : undefined;
  // Quem enfrenta: a fase fixa o oponente (chefe na última do mundo); casual e diário sorteiam.
  // O parâmetro `vs` da URL força um oponente (ou nível); o app nunca o gera na campanha.
  const assigned = puzzle
    ? opponentFor({
        puzzleId: puzzle.id,
        number: puzzle.number,
        mode: daily ? "daily" : casual ? "casual" : "campaign",
        date,
        override: search.get("vs"),
      })
    : undefined;
  const botLevel: BotLevel = assigned?.level ?? "medio";
  const engine = useMemo(
    () => (puzzle ? new PuzzleEngine(puzzle) : undefined),
    [puzzle],
  );
  const sessionKey = daily
    ? `daily:${date}:${botLevel}`
    : `vs:${puzzle?.id}:${botLevel}`;
  const stored = player.sessions[sessionKey];
  // Sessions saved before the duel/confirm flow existed cannot be resumed.
  const session: Session | undefined = engine
    ? stored?.owners && stored.botRack && stored.versus
      ? stored
      : engine.start(sessionKey, botLevel, {
          style: assigned?.style,
          opponent: assigned?.id,
        })
    : undefined;
  return {
    daily,
    casual,
    date,
    puzzle,
    backTo,
    theme,
    botLevel,
    engine,
    sessionKey,
    session,
  };
}
