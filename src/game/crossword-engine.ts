export interface PuzzleWord {
  id: string;
  clue: string;
  answer: string;
  direction: "horizontal" | "vertical";
  startRow: number;
  startCol: number;
  clueRow: number;
  clueCol: number;
  arrow: "right" | "down";
  icon?: string;
}
export const GRID_COLS = 8;
export const GRID_ROWS = 10;
/** Limites de legibilidade do texto de uma pista numa célula (metade de uma célula dupla = 2 linhas). */
export const CLUE_MAX_CHARS = 18;
export const CLUE_MAX_WORD = 9;
export const CLUE_MAX_BLOCKS = 5;
/** Grades do casual são abertas (só palavras do tema): pelo menos tantas casas de resposta. */
export const CASUAL_MIN_LETTERS = 40;
export type Owner = "p" | "ai";
export type BotLevel = "facil" | "medio" | "dificil";
/** Jeito de jogar do oponente: o cuidadoso acerta mais e joga menos letras; o agressivo arrisca. */
export type BotStyle = "cuidadoso" | "agressivo";
export interface VersusState {
  level: BotLevel;
  turn: Owner;
  /** Seed e contador persistidos: recarregar a página não altera a sequência do bot. */
  seed: string;
  rngCount: number;
  /** Estilo e personagem do oponente desta partida (partidas antigas não têm). */
  style?: BotStyle;
  opponent?: string;
}
export const economy = {
  hint: 20,
  duel: { win: 50, draw: 25, loss: 10 },
  /** Estrelas ganhas ao vencer, conforme a dificuldade do oponente. */
  duelStars: { facil: 1, medio: 2, dificil: 3 },
  letterPoint: 1,
  /** Pontos perdidos por cada letra confirmada no lugar errado (o placar não passa de 0). */
  wrongLetter: 1,
  swap: 10,
  daily: 70,
  rackStart: 5,
  rackMax: 5,
  swapMax: 5,
};
export interface Puzzle {
  id: string;
  number: number;
  world: string;
  difficulty: string;
  rows: number;
  cols: number;
  words: PuzzleWord[];
}
export interface Tile {
  id: string;
  letter: string;
  /** Casa ocupada pela peça (colocada ou consumida); ausente no banco e na reserva. */
  cell?: string;
}
export interface Session {
  puzzleId: string;
  letters: Record<string, string>;
  locked: string[];
  claimed: boolean;
  tiles: Record<string, Tile>;
  /** Peças ainda não distribuídas (reserva virtual), em ordem de entrega. */
  supply: string[];
  /** Peças disponíveis ao jogador. */
  rack: string[];
  /** Casas com peças colocadas, na ordem da inserção (usado por Remover). */
  history: string[];
  /** Quem confirmou cada casa (casas reveladas por ajuda não têm dono). */
  owners: Record<string, Owner>;
  scores: Record<Owner, number>;
  /** Peças que o oponente tem na mão (sorteadas da reserva); só existe no duelo. */
  botRack: string[];
  versus: VersusState;
}
export type PuzzleCell =
  | { kind: "blocked"; key: string; row: number; col: number }
  | { kind: "clue"; key: string; row: number; col: number; words: PuzzleWord[] }
  | {
      kind: "letter";
      key: string;
      row: number;
      col: number;
      solution: string;
      wordIds: string[];
    };
export const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
export const key = (row: number, col: number) => `${row},${col}`;
export const positions = (word: PuzzleWord) =>
  Array.from(normalize(word.answer), (letter, i) => ({
    key: key(
      word.startRow + (word.direction === "vertical" ? i : 0),
      word.startCol + (word.direction === "horizontal" ? i : 0),
    ),
    letter,
  }));
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
const hash = (text: string) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
export const seededRandom = (seed: string, count = 0) =>
  random(hash(`${seed}:${count}`));
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const copy = (s: Session): Session => ({
  ...s,
  letters: { ...s.letters },
  locked: [...s.locked],
  tiles: Object.fromEntries(
    Object.entries(s.tiles).map(([id, t]) => [id, { ...t }]),
  ),
  supply: [...s.supply],
  rack: [...s.rack],
  history: [...s.history],
  owners: { ...s.owners },
  scores: { ...s.scores },
  botRack: [...s.botRack],
  versus: { ...s.versus },
});
/**
 * Inventário de peças: uma peça por casa de resposta distinta da solução
 * (cruzamentos contam uma vez). Cada peça está em exatamente um lugar:
 * reserva (`supply`), banco (`rack`), colocada (casa aberta) ou consumida
 * (casa confirmada). Nunca cria letras fora da solução.
 */
export class RackManager {
  readonly solution: Record<string, string> = {};
  constructor(private puzzle: Puzzle) {
    for (const w of puzzle.words)
      for (const c of positions(w)) this.solution[c.key] = c.letter;
  }
  create(
    seed: string,
    level: BotLevel,
    who: { style?: BotStyle; opponent?: string } = {},
  ): Session {
    const letters = Object.values(this.solution);
    const tiles: Record<string, Tile> = {};
    const supply = letters.map((letter, i) => {
      tiles[`t${i}`] = { id: `t${i}`, letter };
      return `t${i}`;
    });
    const rand = random(hash(`${this.puzzle.id}:${seed}`));
    for (let i = supply.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [supply[i], supply[j]] = [supply[j], supply[i]];
    }
    return this.ensurePlayable({
      puzzleId: this.puzzle.id,
      letters: {},
      locked: [],
      claimed: false,
      tiles,
      supply,
      rack: [],
      history: [],
      owners: {},
      scores: { p: 0, ai: 0 },
      botRack: [],
      versus: {
        level,
        turn: "p",
        seed,
        rngCount: 0,
        ...(who.style ? { style: who.style } : {}),
        ...(who.opponent ? { opponent: who.opponent } : {}),
      },
    });
  }
  tileAt(s: Session, cell: string) {
    return Object.values(s.tiles).find((t) => t.cell === cell);
  }
  /** Letras das casas ainda vazias. */
  private needs(s: Session) {
    const n: Record<string, number> = {};
    for (const [k, letter] of Object.entries(this.solution))
      if (!s.letters[k]) n[letter] = (n[letter] ?? 0) + 1;
    return n;
  }
  /** Necessidade restante depois de descontar as peças já nas mãos do jogador. */
  private spare(s: Session, held: string[]) {
    const n = this.needs(s);
    for (const id of [...held, ...s.botRack]) {
      const letter = s.tiles[id].letter;
      n[letter] = (n[letter] ?? 0) - 1;
    }
    return n;
  }
  private ordered(s: Session, focus?: PuzzleWord) {
    const want = new Set(
      focus
        ? positions(focus)
            .filter((c) => !s.letters[c.key])
            .map((c) => c.letter)
        : [],
    );
    return [...s.supply].sort(
      (a, b) =>
        Number(want.has(s.tiles[b].letter)) -
        Number(want.has(s.tiles[a].letter)),
    );
  }
  /** Sorteia peças úteis da reserva para o banco do jogador ou, com `bot`, para a mão do oponente. */
  private draw(s: Session, count: number, focus?: PuzzleWord, bot = false) {
    const spare = this.spare(s, s.rack);
    const picked: string[] = [];
    const hand = bot ? s.botRack : s.rack;
    const room = Math.min(count, economy.rackMax - hand.length);
    for (const id of this.ordered(s, focus)) {
      if (picked.length >= room) break;
      const letter = s.tiles[id].letter;
      if ((spare[letter] ?? 0) <= 0) continue;
      spare[letter]--;
      picked.push(id);
    }
    s.supply = s.supply.filter((id) => !picked.includes(id));
    hand.push(...picked);
    return picked;
  }
  private unplace(s: Session, cell: string) {
    const tile = this.tileAt(s, cell)!;
    delete s.letters[cell];
    delete tile.cell;
    s.history = s.history.filter((h) => h !== cell);
    if (s.rack.length < economy.rackMax) s.rack.push(tile.id);
    else s.supply.push(tile.id);
  }
  /**
   * Recuperação gratuita (a reposição normal acontece ao confirmar o turno): sem nenhuma
   * jogada possível, as peças inúteis voltam à reserva; se ainda faltar peça útil, uma
   * letra necessária presa em casa errada ou na mão do oponente vai para o banco.
   */
  ensurePlayable(input: Session, focus?: PuzzleWord): Session {
    const s = copy(input);
    if (!Object.keys(this.solution).some((k) => !s.letters[k])) return s;
    const useful = (id: string) => (this.needs(s)[s.tiles[id].letter] ?? 0) > 0;
    // Banco vazio sem nada pendente: nada a esperar, recebe peças já.
    if (!s.rack.length && !s.history.length)
      this.draw(s, economy.rackStart, focus);
    // Banco só com peças inúteis: troca grátis.
    else if (s.rack.length && !s.rack.some(useful)) {
      s.supply.push(...s.rack);
      s.rack = [];
      this.draw(s, economy.rackStart, focus);
    }
    if (s.rack.length && !s.rack.some(useful)) {
      for (const k of [...s.history].reverse()) {
        const tile = this.tileAt(s, k);
        if (!tile || s.letters[k] === this.solution[k]) continue;
        if ((this.needs(s)[tile.letter] ?? 0) <= 0) continue;
        this.unplace(s, k);
        break;
      }
    }
    // A letra que falta está na mão do oponente: ele a devolve ao jogador.
    if (!s.rack.some(useful) && !s.history.length) {
      const held = s.botRack.find(useful);
      if (held) {
        s.botRack = s.botRack.filter((id) => id !== held);
        s.rack.push(held);
      }
    }
    return s;
  }
  /**
   * Coloca a peça numa casa da palavra (a indicada, ou a primeira vazia). Uma casa com letra
   * ainda não confirmada pode ser substituída: a peça antiga volta ao banco.
   */
  place(input: Session, word: PuzzleWord, tileId: string, cell?: string) {
    const target = positions(word).find((c) =>
      cell
        ? c.key === cell && !input.locked.includes(c.key)
        : !input.letters[c.key],
    );
    if (!target || !input.rack.includes(tileId)) return undefined;
    const s = copy(input);
    s.rack = s.rack.filter((id) => id !== tileId);
    if (s.letters[target.key]) this.unplace(s, target.key);
    s.tiles[tileId].cell = target.key;
    s.letters[target.key] = s.tiles[tileId].letter;
    s.history.push(target.key);
    return s;
  }
  /** Move uma peça ainda não confirmada para outra casa; a peça que estiver lá volta ao banco. */
  move(input: Session, word: PuzzleWord, from: string, to: string) {
    const pending = (k: string) =>
      input.letters[k] && !input.locked.includes(k);
    const target = positions(word).find(
      (c) => c.key === to && !input.locked.includes(c.key),
    );
    if (!target || from === to || !pending(from)) return undefined;
    const s = copy(input);
    const tile = this.tileAt(s, from)!;
    if (s.letters[to]) this.unplace(s, to);
    delete s.letters[from];
    s.history = s.history.filter((h) => h !== from);
    tile.cell = to;
    s.letters[to] = tile.letter;
    s.history.push(to);
    return s;
  }
  /** Devolve ao banco a última peça colocada, ou a da casa indicada. */
  remove(input: Session, at?: string) {
    const pending = (k: string) =>
      input.letters[k] && !input.locked.includes(k);
    const cell = at
      ? pending(at)
        ? at
        : undefined
      : [...input.history].reverse().find(pending);
    if (!cell) return undefined;
    const s = copy(input);
    this.unplace(s, cell);
    return s;
  }
  /** Substitui peças do banco por outras letras necessárias e diferentes. */
  swap(input: Session, ids: string[], focus?: PuzzleWord) {
    const out = [...new Set(ids)];
    if (
      !out.length ||
      out.length > economy.swapMax ||
      out.some((id) => !input.rack.includes(id))
    )
      return undefined;
    const s = copy(input);
    const spare = this.spare(
      s,
      s.rack.filter((id) => !out.includes(id)),
    );
    const replace: Record<string, string> = {};
    const taken = new Set<string>();
    for (const id of out) {
      const pick = this.ordered(s, focus).find((c) => {
        const letter = s.tiles[c].letter;
        return (
          !taken.has(c) &&
          letter !== s.tiles[id].letter &&
          (spare[letter] ?? 0) > 0
        );
      });
      if (!pick) return undefined;
      spare[s.tiles[pick].letter]--;
      taken.add(pick);
      replace[id] = pick;
    }
    s.rack = s.rack.map((id) => replace[id] ?? id);
    s.supply = [...s.supply.filter((id) => !taken.has(id)), ...out];
    return s;
  }
  /**
   * Trava uma casa com a letra certa, consumindo a peça na ordem banco → reserva → peça
   * colocada em outra casa. Usada pela Dica e pelo bot; devolve false sem alterar
   * nada se não houver peça.
   */
  lockCell(s: Session, cell: string, who?: Owner) {
    const letter = this.solution[cell];
    const current = this.tileAt(s, cell);
    if (!current || current.letter !== letter) {
      const sameLetter = (id: string) => s.tiles[id].letter === letter;
      const placedElsewhere = () =>
        Object.values(s.tiles)
          .filter(
            (t) =>
              t.cell &&
              t.cell !== cell &&
              !s.locked.includes(t.cell) &&
              t.letter === letter,
          )
          .sort(
            (a, b) =>
              Number(this.solution[a.cell!] === a.letter) -
              Number(this.solution[b.cell!] === b.letter),
          )[0]?.id;
      // O oponente só joga com as peças que tem na mão.
      const source =
        who === "ai"
          ? s.botRack.find(sameLetter)
          : (s.rack.find(sameLetter) ??
            s.supply.find(sameLetter) ??
            placedElsewhere() ??
            s.botRack.find(sameLetter));
      if (!source) return false;
      if (current) this.unplace(s, cell);
      if (s.rack.includes(source)) s.rack = s.rack.filter((r) => r !== source);
      else if (s.supply.includes(source))
        s.supply = s.supply.filter((r) => r !== source);
      else if (s.botRack.includes(source))
        s.botRack = s.botRack.filter((r) => r !== source);
      else {
        delete s.letters[s.tiles[source].cell!];
        s.history = s.history.filter((h) => h !== s.tiles[source].cell);
      }
      s.tiles[source].cell = cell;
      s.letters[cell] = letter;
    }
    s.locked.push(cell);
    s.history = s.history.filter((h) => h !== cell);
    if (who) s.owners[cell] = who;
    return true;
  }
  /** Dica: revela e confirma uma letra correta da palavra, sem pontos. */
  hint(input: Session, word: PuzzleWord) {
    const open = positions(word).filter((c) => !input.locked.includes(c.key));
    if (!open.length) return undefined;
    const target =
      open.find((c) => input.letters[c.key] !== c.letter) ?? open[0];
    const s = copy(input);
    if (!this.lockCell(s, target.key)) return undefined;
    return s;
  }
  /**
   * Confirma as peças pendentes: as corretas travam (dono `who`, +1 ponto cada); as erradas
   * voltam ao banco e custam 1 ponto cada (o placar não fica abaixo de 0).
   */
  confirm(input: Session, who: Owner) {
    const pending = input.history.filter(
      (k) => input.letters[k] && !input.locked.includes(k),
    );
    const s = copy(input);
    let gained = 0;
    let returned = 0;
    const wrongCells: string[] = [];
    for (const k of pending) {
      if (s.letters[k] === this.solution[k]) {
        s.locked.push(k);
        s.owners[k] = who;
        gained++;
      } else {
        this.unplace(s, k);
        wrongCells.push(k);
        returned++;
      }
    }
    s.history = s.history.filter((k) => !s.locked.includes(k));
    // Cada letra confirmada no lugar errado custa pontos, mas o placar nunca fica negativo.
    const before = s.scores[who];
    s.scores[who] = Math.max(
      0,
      before + gained * economy.letterPoint - returned * economy.wrongLetter,
    );
    const penalty = before + gained * economy.letterPoint - s.scores[who];
    return {
      session: s,
      gained,
      returned,
      penalty,
      wrongCells,
      pending: pending.length,
    };
  }
  /** Trava casas em nome de `who` (bot) pelo inventário compartilhado; não toca peças pendentes. */
  playCells(input: Session, cells: string[], who: Owner, limit = Infinity) {
    if (input.history.length) return undefined;
    const s = copy(input);
    let gained = 0;
    for (const k of cells) {
      if (gained >= limit) break;
      if (s.locked.includes(k) || !(k in this.solution)) continue;
      if (!this.lockCell(s, k, who)) {
        // O oponente pula as casas para as quais não tem a letra na mão.
        if (who === "ai") continue;
        return undefined;
      }
      gained++;
    }
    s.scores[who] += gained * economy.letterPoint;
    return { session: s, gained };
  }
  /** O oponente tem alguma peça que serve a uma casa ainda vazia? */
  botHasMove(s: Session) {
    const needs = this.needs(s);
    return s.botRack.some((id) => (needs[s.tiles[id].letter] ?? 0) > 0);
  }
  /** Reabastece o banco com peças úteis até a quantidade inicial, sem retirar nenhuma. */
  topUp(input: Session) {
    const s = copy(input);
    const missing = economy.rackStart - s.rack.length;
    if (missing > 0) this.draw(s, missing);
    return s;
  }
  /** Sorteia a mão inicial do oponente (peças úteis da reserva, ao acaso). */
  dealBot(input: Session) {
    const s = copy(input);
    s.botRack = [];
    this.draw(s, economy.rackStart, undefined, true);
    return s;
  }
  /** Repõe a mão do oponente até cinco peças. */
  topUpBot(input: Session) {
    const s = copy(input);
    const missing = economy.rackStart - s.botRack.length;
    if (missing > 0) this.draw(s, missing, undefined, true);
    return s;
  }
  /** Sem jogada possível, o oponente devolve a mão à reserva e sorteia outra. */
  exchangeBot(input: Session) {
    const s = copy(input);
    s.supply.push(...s.botRack);
    s.botRack = [];
    this.draw(s, economy.rackStart, undefined, true);
    return s;
  }
  /** Lista violações das regras de conservação; vazia quando consistente. */
  audit(s: Session) {
    const errors: string[] = [];
    const places = new Map<string, number>();
    const bump = (id: string) => places.set(id, (places.get(id) ?? 0) + 1);
    s.supply.forEach(bump);
    s.rack.forEach(bump);
    s.botRack.forEach(bump);
    for (const t of Object.values(s.tiles)) {
      if (!t.cell) continue;
      bump(t.id);
      if (!(t.cell in this.solution)) errors.push("Peça fora da solução");
      if (s.letters[t.cell] !== t.letter) errors.push("Letra sem peça");
    }
    for (const id of Object.keys(s.tiles))
      if (places.get(id) !== 1)
        errors.push(`Peça ${id} em ${places.get(id) ?? 0} lugares`);
    const sorted = (letters: string[]) => letters.sort().join("");
    if (
      sorted(Object.values(s.tiles).map((t) => t.letter)) !==
      sorted(Object.values(this.solution))
    )
      errors.push("Letras diferentes da solução");
    for (const [k, letter] of Object.entries(s.letters))
      if (this.tileAt(s, k)?.letter !== letter) errors.push("Casa sem peça");
    for (const k of s.locked)
      if (s.letters[k] !== this.solution[k])
        errors.push("Casa confirmada errada");
    if (s.rack.length > economy.rackMax) errors.push("Banco acima do limite");
    if (s.botRack.length > economy.rackMax)
      errors.push("Mão do oponente acima do limite");
    return errors;
  }
}
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
