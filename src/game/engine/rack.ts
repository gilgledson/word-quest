import {
  economy,
  type BotLevel,
  type BotStyle,
  type Owner,
  type Puzzle,
  type PuzzleWord,
  type Session,
  type Tile,
} from "./types";
import { positions } from "./grid";
import { hash, random } from "./random";
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
