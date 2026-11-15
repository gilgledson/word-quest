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
  // Não dá para retomar: sessões de antes do duelo/confirmar e sessões gravadas numa versão antiga
  // da grade (a fase foi gerada de novo e as letras salvas não batem mais com a solução).
  const resumable =
    !!engine &&
    !!stored?.owners &&
    !!stored.botRack &&
    !!stored.versus &&
    fitsGrid(engine, stored);
  const session: Session | undefined = engine
    ? resumable
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

/**
 * A sessão é desta versão da grade: as peças têm exatamente as letras da solução e as casas
 * ocupadas existem nela, com as confirmadas certas. Uma fase gerada de novo falha aqui.
 */
function fitsGrid(engine: PuzzleEngine, s: Session) {
  const solution = engine.rack.solution;
  const sorted = (letters: string[]) => letters.sort().join("");
  const tiles = Object.values(s.tiles ?? {}).filter((t) => !t.joker);
  return (
    sorted(tiles.map((t) => t.letter)) === sorted(Object.values(solution)) &&
    Object.keys(s.letters).every((k) => k in solution) &&
    s.locked.every((k) => s.letters[k] === solution[k])
  );
}
