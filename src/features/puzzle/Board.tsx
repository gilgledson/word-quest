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
import { MT } from "../../i18n/match";

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
  /** Letras que o rival está colocando agora, uma a uma (ainda não confirmadas na sessão). */
  botReveal?: Record<string, string>;
  /** Casas confirmadas pelo rival na última vez dele (ficam marcadas até o jogador confirmar). */
  lastBotCells?: string[];
  /** As casas da última jogada do rival piscam (o jogador tocou no resumo). */
  lastBotPing?: boolean;
  /** Peças em voo: a letra fica invisível na casa até chegar. */
  flying?: ReadonlySet<string>;
  /** Escolhe a palavra; `cell` é a casa tocada (a próxima peça entra nela). */
  onChoose: (wordId: string, cell?: string) => void;
  /** Devolve ao banco a letra pendente da casa. */
  onUnplace: (cell: string) => void;
  /** Arte da moldura do tabuleiro comprado (game/boards); sem ela, a grade de sempre. */
  boardFrame?: string;
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
  botReveal,
  lastBotCells,
  lastBotPing,
  flying,
  onChoose,
  onUnplace,
  boardFrame,
}: Props) {
  const { ref: gridRef, cell: cellSize, rotated } = grid;
  const pending = (cell: string) =>
    !!session.letters[cell] && !session.locked.includes(cell);
  /** Curinga ainda pendente: mostra a estrela, não a letra (que só aparece ao confirmar). */
  const hiddenJoker = (cell: string) => pending(cell) && !!tileOf(cell)?.joker;
  const tileOf = (cell: string) =>
    Object.values(session.tiles).find((t) => t.cell === cell);
  // Deitado, o tabuleiro é transposto (linha vira coluna), não girado: as palavras continuam
  // sendo lidas da esquerda para a direita e de cima para baixo, com a pista antes da resposta.
  // (Girar fazia as horizontais serem lidas de baixo para cima, com sequências que pareciam
  // palavras sem pista.) A seta fica na borda da casa da pista, apontando para a resposta.
  const arrowTo = (arrow: PuzzleWord["arrow"]) =>
    (arrow === "right") !== rotated ? "right" : "down";
  const place = (r: number, c: number): CSSProperties | undefined =>
    rotated ? { gridRow: c + 1, gridColumn: r + 1 } : undefined;
  const clueHalf = (w: PuzzleWord) => (
    <button
      key={w.id}
      className={`clue-half ${selected === w.id ? "selected-clue" : ""}`}
      onClick={() => onChoose(w.id)}
      aria-label={MT.clueLabel(w.clue, arrowTo(w.arrow) === "right")}
    >
      {w.icon && (
        <span className={`game-art art-${w.icon}`} aria-hidden="true" />
      )}
      <span>{w.clue}</span>
      <i className={`clue-arrow to-${arrowTo(w.arrow)}`} aria-hidden="true" />
    </button>
  );
  return (
    <div className="board-area" ref={gridRef}>
      <div
        className={`board-wrap ${boardFrame ? "framed" : ""}`}
        style={
          boardFrame
            ? ({ "--board-frame": `url(${boardFrame})` } as CSSProperties)
            : undefined
        }
      >
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
              // Na casa dupla, a pista que aponta para a direita (na tela) fica em cima.
              const halves = [...cell.words].sort(
                (a, b) =>
                  Number(arrowTo(a.arrow) === "down") -
                  Number(arrowTo(b.arrow) === "down"),
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
            // Casa 2×/3× letra: grande no meio da casa vazia; com letra (pendente ou travada), no canto.
            const mult = engine.rack.bonus[ck];
            const botLetter = session.letters[ck] ? undefined : botReveal?.[ck];
            const filled = !!(session.letters[ck] ?? botLetter);
            return (
              <button
                {...(mine && pending(ck)
                  ? letterDrag.bind(
                      tileOf(ck)?.id ?? "",
                      hiddenJoker(ck) ? "★" : session.letters[ck],
                    )
                  : {})}
                className={`cell letter ${isActive ? "active sweep" : ""} ${currentKey === ck ? "cursor" : ""} ${locked ? "correct" : ""} ${owner ? `owner-${owner}` : ""} ${botLetter ? "bot-reveal owner-ai" : ""} ${lastBotCells?.includes(ck) ? `last-bot ${lastBotPing ? "ping" : ""}` : ""} ${tileOf(ck)?.joker ? "joker-cell" : ""} ${hiddenJoker(ck) ? "joker-hidden" : ""} ${flying?.has(tileOf(ck)?.id ?? "") ? "in-flight" : ""} ${pending(ck) ? "pending" : ""} ${flash.includes(ck) ? "flash" : ""} ${mult ? `mult mult-${mult}${filled ? " filled" : ""}` : ""} ${placedCells.has(ck) ? "just-placed" : ""} ${revealedCells.has(ck) ? "just-revealed" : ""} ${letterDrag.drag?.tileId === tileOf(ck)?.id && pending(ck) ? "drag-source" : ""}`}
                data-cell={ck}
                style={
                  {
                    ...place(r, c),
                    "--i": active.findIndex((a) => a.key === ck),
                    "--flash-i": Math.max(0, flash.indexOf(ck)),
                  } as CSSProperties
                }
                data-words={belongs.map((w) => w.id).join(" ")}
                key={ck}
                aria-label={MT.cellLabel(
                  r + 1,
                  c + 1,
                  hiddenJoker(ck)
                    ? MT.jokerCell
                    : (session.letters[ck] ?? botLetter ?? MT.empty),
                )}
                onClick={(event) => {
                  if (!letterDrag.clickAllowed(event.detail === 0)) return;
                  if (mine && pending(ck)) onUnplace(ck);
                  else
                    onChoose(
                      (belongs.find((w) => w.id !== selected) ?? belongs[0]).id,
                      ck,
                    );
                }}
              >
                {hiddenJoker(ck) ? "★" : (session.letters[ck] ?? botLetter)}
                {locked && <i />}
                {mult && (
                  <em className="mult-tag" aria-hidden="true">
                    {mult}×
                  </em>
                )}
              </button>
            );
          })}
        </div>
        {boardFrame && <i className="board-frame-art" aria-hidden="true" />}
      </div>
    </div>
  );
}
