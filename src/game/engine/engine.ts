import {
  economy,
  type BotLevel,
  type BotStyle,
  type Owner,
  type Puzzle,
  type PuzzleCell,
  type PuzzleWord,
  type Session,
} from "./types";
import { key, positions } from "./grid";
import { PuzzleValidator } from "./validator";
import { RackManager } from "./rack";
export class PuzzleEngine {
  readonly rack: RackManager;
  constructor(public puzzle: Puzzle) {
    const errors = PuzzleValidator.validate(puzzle);
    if (errors.length) throw new Error(errors.join("; "));
    this.rack = new RackManager(puzzle);
  }
  /** Nova partida: o jogo é sempre um duelo contra o oponente do nível dado. */
  start(
    seed: string,
    level: BotLevel,
    who: { style?: BotStyle; opponent?: string } = {},
  ): Session {
    return this.rack.dealBot(this.rack.create(seed, level, who));
  }
  matrix(): PuzzleCell[] {
    const cells: PuzzleCell[] = Array.from(
      { length: this.puzzle.rows * this.puzzle.cols },
      (_, i) => {
        const row = Math.floor(i / this.puzzle.cols),
          col = i % this.puzzle.cols;
        return { kind: "blocked", key: key(row, col), row, col };
      },
    );
    for (const word of this.puzzle.words) {
      const clueIndex = word.clueRow * this.puzzle.cols + word.clueCol;
      const previous = cells[clueIndex];
      cells[clueIndex] = {
        kind: "clue",
        key: key(word.clueRow, word.clueCol),
        row: word.clueRow,
        col: word.clueCol,
        words: [...(previous.kind === "clue" ? previous.words : []), word],
      };
      for (const position of positions(word)) {
        const [row, col] = position.key.split(",").map(Number);
        const index = row * this.puzzle.cols + col;
        const previous = cells[index];
        cells[index] = {
          kind: "letter",
          key: position.key,
          row,
          col,
          solution: position.letter,
          wordIds: [
            ...(previous.kind === "letter" ? previous.wordIds : []),
            word.id,
          ],
        };
      }
    }
    return cells;
  }
  private word(id: string) {
    const word = this.puzzle.words.find((w) => w.id === id);
    if (!word) throw new Error("Palavra inexistente");
    return word;
  }
  private refresh(s: Session | undefined, focus?: PuzzleWord) {
    return s && this.rack.ensurePlayable(s, focus);
  }
  /** Coloca a peça na casa indicada (arrastar) ou na primeira casa vazia da palavra. */
  insert(s: Session, wordId: string, tileId: string, cell?: string): Session {
    const word = this.word(wordId);
    return this.refresh(this.rack.place(s, word, tileId, cell), word) ?? s;
  }
  /** Arrasta uma letra pendente para outra casa não confirmada. */
  relocate(s: Session, wordId: string, from: string, to: string): Session {
    const word = this.word(wordId);
    return this.refresh(this.rack.move(s, word, from, to), word) ?? s;
  }
  remove(s: Session, focus?: PuzzleWord, at?: string) {
    return this.refresh(this.rack.remove(s, at), focus);
  }
  swap(s: Session, ids: string[], focus?: PuzzleWord) {
    return this.refresh(this.rack.swap(s, ids, focus), focus);
  }
  hint(s: Session, wordId: string) {
    const word = this.word(wordId);
    return this.refresh(this.rack.hint(s, word), word);
  }
  /**
   * Fechar uma palavra vale o tamanho dela inteiro (1 ponto por letra, mesmo as colocadas antes
   * por qualquer jogador), mesmo que a jogada tenha acrescentado uma só letra. Como a letra nova
   * já está contada em `gained`, o bônus é o que falta para chegar a esse total; um cruzamento
   * que fecha duas palavras conta em cada uma.
   */
  private completionBonus(
    before: Session,
    after: Session,
    done: PuzzleWord[],
    gained: number,
  ) {
    if (!gained || !done.length) return 0;
    const fresh = new Set(
      after.locked.filter((k) => !before.locked.includes(k)),
    );
    const inDone = new Set(done.flatMap((w) => positions(w).map((c) => c.key)));
    const covered = [...fresh].filter((k) => inDone.has(k)).length;
    const total = done.reduce((n, w) => n + positions(w).length, 0);
    return (total - covered) * economy.letterPoint;
  }
  /** Palavras totalmente confirmadas. */
  solved(s: Session) {
    return this.puzzle.words.filter((w) =>
      positions(w).every((c) => s.locked.includes(c.key)),
    );
  }
  complete(s: Session) {
    return this.solved(s).length === this.puzzle.words.length;
  }
  /** Sem jogada possível, o oponente troca a mão e passa a vez. */
  exchangeBot(s: Session) {
    return this.rack.exchangeBot(s);
  }
  /** Jogada do bot: trava as casas pelo motor, repõe o banco e paga a palavra completa. */
  play(s: Session, cells: string[], who: Owner = "ai", limit = Infinity) {
    const before = new Set(this.solved(s).map((w) => w.id));
    const r = this.rack.playCells(s, cells, who, limit);
    if (!r) return undefined;
    const done = this.solved(r.session).filter((w) => !before.has(w.id));
    const bonus = this.completionBonus(s, r.session, done, r.gained);
    r.session.scores[who] += bonus;
    return {
      session: this.rack.ensurePlayable(this.rack.topUpBot(r.session)),
      gained: r.gained,
      bonus,
    };
  }
  /**
   * ✓ do jogador ou do bot. Sem peças pendentes é "passar". Palavras que ficam completas
   * nesta jogada valem o tamanho inteiro; completar só por ajuda (Dica) não rende.
   */
  confirm(s: Session, who: Owner = "p") {
    const before = new Set(this.solved(s).map((w) => w.id));
    const result = this.rack.confirm(s, who);
    const done = this.solved(result.session).filter((w) => !before.has(w.id));
    const bonus = this.completionBonus(s, result.session, done, result.gained);
    result.session.scores[who] += bonus;
    return {
      // Ao concluir o turno o jogador recebe peças até voltar a cinco.
      session: this.rack.ensurePlayable(this.rack.topUp(result.session)),
      gained: result.gained,
      bonus,
      returned: result.returned,
      penalty: result.penalty,
      wrongCells: result.wrongCells,
      passed: result.pending === 0,
    };
  }
}
