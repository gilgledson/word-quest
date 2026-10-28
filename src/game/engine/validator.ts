import {
  CASUAL_MIN_LETTERS,
  CLUE_MAX_CHARS,
  CLUE_MAX_WORD,
  CLUE_MAX_BLOCKS,
  GRID_COLS,
  GRID_ROWS,
  type Puzzle,
  type PuzzleWord,
  type Session,
} from "./types";
import { key, normalize, positions } from "./grid";
export class PuzzleValidator {
  static validate(p: Puzzle) {
    const errors: string[] = [];
    const solution: Record<string, string> = {};
    const clues = new Map<string, PuzzleWord[]>();
    const inside = (r: number, c: number) =>
      r >= 0 && c >= 0 && r < p.rows && c < p.cols;
    for (const w of p.words) {
      if (!/^[A-Z]+$/.test(normalize(w.answer)))
        errors.push("Resposta inválida");
      if (p.words.filter((other) => other.id === w.id).length !== 1)
        errors.push("ID de palavra duplicado");
      const ck = key(w.clueRow, w.clueCol);
      const shared = clues.get(ck) ?? [];
      // Uma célula de pista guarda até duas pistas, uma para cada direção.
      if (shared.length && (shared.length > 1 || shared[0].arrow === w.arrow))
        errors.push("Pistas sobrepostas");
      clues.set(ck, [...shared, w]);
      if (!inside(w.clueRow, w.clueCol)) errors.push("Pista fora da grade");
      if (
        w.arrow !== (w.direction === "horizontal" ? "right" : "down") ||
        w.startRow !== w.clueRow + (w.direction === "vertical" ? 1 : 0) ||
        w.startCol !== w.clueCol + (w.direction === "horizontal" ? 1 : 0)
      )
        errors.push("Seta inconsistente");
      for (const cell of positions(w)) {
        const [r, c] = cell.key.split(",").map(Number);
        if (!inside(r, c)) errors.push("Letra fora da grade");
        if (solution[cell.key] && solution[cell.key] !== cell.letter)
          errors.push("Conflito de letras");
        solution[cell.key] = cell.letter;
      }
    }
    for (const ck of clues.keys())
      if (solution[ck]) errors.push("Pista sobre resposta");
    for (const w of p.words) {
      const length = normalize(w.answer).length;
      const after = key(
        w.startRow + (w.direction === "vertical" ? length : 0),
        w.startCol + (w.direction === "horizontal" ? length : 0),
      );
      if (solution[after]) errors.push("Casas excedentes após a resposta");
    }
    if (!p.words.length) errors.push("Grade vazia");
    return errors;
  }
  /**
   * Regras extras do catálogo: toda fase tem a mesma grade, é densa (poucos blocos), sem
   * respostas curtas demais e com pistas que cabem na célula.
   */
  static validateCatalog(p: Puzzle) {
    const errors = this.validate(p);
    if (p.rows !== GRID_ROWS || p.cols !== GRID_COLS)
      errors.push(`Grade deve ter ${GRID_COLS}×${GRID_ROWS}`);
    const occupied = new Set<string>();
    for (const w of p.words) {
      occupied.add(key(w.clueRow, w.clueCol));
      for (const c of positions(w)) occupied.add(c.key);
      if (normalize(w.answer).length < 2) errors.push("Resposta curta");
      if (w.clue.length > CLUE_MAX_CHARS) errors.push("Pista longa");
      if (w.clue.split(" ").some((t) => t.length > CLUE_MAX_WORD))
        errors.push("Palavra longa na pista");
    }
    if (p.rows * p.cols - occupied.size > CLUE_MAX_BLOCKS)
      errors.push("Grade pouco densa");
    return errors;
  }
  /**
   * Grades do modo casual: mesmas regras das fases, menos a densidade. Como só entram palavras do tema, a
   * grade é mais aberta (as casas que sobram são blocos), mas precisa ter casas de resposta suficientes.
   */
  static validateCasual(p: Puzzle) {
    const errors = this.validate(p);
    if (p.rows !== GRID_ROWS || p.cols !== GRID_COLS)
      errors.push(`Grade deve ter ${GRID_COLS}×${GRID_ROWS}`);
    const letters = new Set<string>();
    for (const w of p.words) {
      for (const c of positions(w)) letters.add(c.key);
      if (normalize(w.answer).length < 2) errors.push("Resposta curta");
      if (w.clue.length > CLUE_MAX_CHARS) errors.push("Pista longa");
      if (w.clue.split(" ").some((t) => t.length > CLUE_MAX_WORD))
        errors.push("Palavra longa na pista");
    }
    if (letters.size < CASUAL_MIN_LETTERS) errors.push("Grade pouco cheia");
    return errors;
  }
  static correct(w: PuzzleWord, s: Session) {
    return positions(w).every((c) => s.letters[c.key] === c.letter);
  }
}
