import type { CSSProperties } from "react";
import type { useFitGrid } from "../../hooks/useFitGrid";
import type { useLetterDrag } from "../../hooks/useLetterDrag";
import type {
  Puzzle,
  PuzzleEngine,
  PuzzleWord,
  Session,
  positions,
} from "../../game/crossword-engine";

interface Props {
  puzzle: Puzzle;
  engine: PuzzleEngine;
  session: Session;
  grid: ReturnType<typeof useFitGrid>;
  letterDrag: ReturnType<typeof useLetterDrag>;
  /** Pista selecionada. */
  selected: string;
  /** Casas da palavra selecionada. */
  active: ReturnType<typeof positions>;
  /** Próxima casa vazia da palavra selecionada. */
  currentKey?: string;
  /** É a vez do jogador. */
  mine: boolean;
  /** Casas brilhando por terem acabado de pontuar. */
  flash: string[];
  placedCells: Set<string>;
  revealedCells: Set<string>;
  onChoose: (wordId: string) => void;
  /** Devolve ao banco a letra pendente da casa. */
  onUnplace: (cell: string) => void;
}
/** Grade 8×10 com as pistas, as letras e a interação por toque e arrasto. */
export function Board({
  puzzle,
  engine,
  session,
  grid,
  letterDrag,
  selected,
  active,
  currentKey,
  mine,
  flash,
  placedCells,
  revealedCells,
  onChoose,
  onUnplace,
}: Props) {
  const { ref: gridRef, cell: cellSize, rotated } = grid;
  const pending = (cell: string) =>
    !!session.letters[cell] && !session.locked.includes(cell);
  const tileOf = (cell: string) =>
    Object.values(session.tiles).find((t) => t.cell === cell);
  // A quarter turn counter-clockwise: words that ran right now run up, and down becomes right.
  const arrowGlyph = (arrow: PuzzleWord["arrow"]) =>
    arrow === "right" ? (rotated ? "↑" : "→") : rotated ? "→" : "↓";
  const place = (r: number, c: number): CSSProperties | undefined =>
    rotated ? { gridRow: puzzle.cols - c, gridColumn: r + 1 } : undefined;
  const clueHalf = (w: PuzzleWord) => (
    <button
      key={w.id}
      className={`clue-half ${selected === w.id ? "selected-clue" : ""}`}
      onClick={() => onChoose(w.id)}
      aria-label={`Pista: ${w.clue}, ${w.direction === "horizontal" ? "horizontal" : "vertical"}`}
    >
      {w.icon && (
        <span className={`game-art art-${w.icon}`} aria-hidden="true" />
      )}
      <span>{w.clue}</span>
      <b>{arrowGlyph(w.arrow)}</b>
    </button>
  );
  return (
    <div className="board-area" ref={gridRef}>
      <div
        className="board"
        style={
          {
            "--cell": `${cellSize}px`,
            gridTemplateColumns: `repeat(${rotated ? puzzle.rows : puzzle.cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rotated ? puzzle.cols : puzzle.rows}, ${cellSize}px)`,
          } as CSSProperties
        }
      >
        {engine.matrix().map((cell) => {
          const { row: r, col: c, key: ck } = cell;
          if (cell.kind === "clue") {
            const halves = [...cell.words].sort(
              (a, b) => Number(a.arrow === "down") - Number(b.arrow === "down"),
            );
            return (
              <div
                className={`cell clue ${halves.length > 1 ? "double" : ""}`}
                key={ck}
                style={place(r, c)}
              >
                {halves.map(clueHalf)}
              </div>
            );
          }
          const belongs =
            cell.kind === "letter"
              ? puzzle.words.filter((w) => cell.wordIds.includes(w.id))
              : [];
          if (!belongs.length)
            return (
              <div
                className="cell blocked"
                key={ck}
                style={place(r, c)}
                aria-hidden="true"
              />
            );
          const isActive = active.some((p) => p.key === ck);
          const locked = session.locked.includes(ck);
          const owner = session.owners[ck];
          return (
            <button
              {...(mine && pending(ck)
                ? letterDrag.bind(tileOf(ck)?.id ?? "", session.letters[ck])
                : {})}
              className={`cell letter ${isActive ? "active sweep" : ""} ${currentKey === ck ? "cursor" : ""} ${locked ? "correct" : ""} ${owner ? `owner-${owner}` : ""} ${pending(ck) ? "pending" : ""} ${flash.includes(ck) ? "flash" : ""} ${placedCells.has(ck) ? "just-placed" : ""} ${revealedCells.has(ck) ? "just-revealed" : ""} ${letterDrag.drag?.tileId === tileOf(ck)?.id && pending(ck) ? "drag-source" : ""}`}
              data-cell={ck}
              style={
                {
                  ...place(r, c),
                  "--i": active.findIndex((a) => a.key === ck),
                } as CSSProperties
              }
              data-words={belongs.map((w) => w.id).join(" ")}
              key={ck}
              aria-label={`Linha ${r + 1}, coluna ${c + 1}: ${session.letters[ck] ?? "vazia"}`}
              onClick={(event) => {
                if (!letterDrag.clickAllowed(event.detail === 0)) return;
                if (mine && pending(ck)) onUnplace(ck);
                else
                  onChoose(
                    (belongs.find((w) => w.id !== selected) ?? belongs[0]).id,
                  );
              }}
            >
              {session.letters[ck]}
              {locked && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
