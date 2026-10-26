import { describe, it, expect } from "vitest";
import { levels } from "../data/catalog";
import {
  PuzzleEngine,
  economy,
  positions,
  seededRandom,
  type BotLevel,
  type Puzzle,
  type Session,
} from "../game/crossword-engine";
import {
  FILL_WEIGHT,
  LENGTH_PENALTY,
  OPPONENT_LEVELS,
  opponentTurn,
  planMove,
  successChance,
} from "../game/opponent";

const LEVELS: BotLevel[] = ["facil", "medio", "dificil"];
const roundtrip = (s: Session) => JSON.parse(JSON.stringify(s)) as Session;

describe("Chance de sucesso do bot", () => {
  it("usa só dificuldade, letras reveladas e tamanho", () => {
    const clamp = (v: number) => Math.min(0.97, Math.max(0.05, v));
    expect(successChance("facil", 0, 5)).toBeCloseTo(
      clamp(OPPONENT_LEVELS.facil.base - LENGTH_PENALTY * 5),
    );
    expect(successChance("medio", 2, 4)).toBeCloseTo(
      clamp(
        OPPONENT_LEVELS.medio.base + FILL_WEIGHT * 0.5 - LENGTH_PENALTY * 4,
      ),
    );
    expect(successChance("dificil", 4, 4)).toBeLessThanOrEqual(0.97);
    expect(successChance("facil", 0, 9)).toBeGreaterThanOrEqual(0.05);
  });
  it("cresce com as letras reveladas e diminui com o tamanho", () => {
    for (const level of LEVELS) {
      expect(successChance(level, 3, 5)).toBeGreaterThan(
        successChance(level, 1, 5),
      );
      expect(successChance(level, 2, 4)).toBeGreaterThan(
        successChance(level, 2, 7),
      );
    }
  });
  it("respeita a ordem de dificuldade", () => {
    expect(successChance("dificil", 1, 5)).toBeGreaterThan(
      successChance("medio", 1, 5),
    );
    expect(successChance("medio", 1, 5)).toBeGreaterThan(
      successChance("facil", 1, 5),
    );
  });
  it("limita letras por turno: 2, 4 e a mão inteira (5)", () => {
    expect(OPPONENT_LEVELS.facil.maxLetters).toBe(2);
    expect(OPPONENT_LEVELS.medio.maxLetters).toBe(4);
    expect(OPPONENT_LEVELS.dificil.maxLetters).toBe(5);
  });
});

describe("Jogada do bot", () => {
  const puzzle = levels[0];
  const engine = new PuzzleEngine(puzzle);
  it("é determinística pela seed e pelo contador, mesmo após salvar e restaurar", () => {
    const s = engine.start("seed-a", "medio");
    const a = opponentTurn(engine, roundtrip(s));
    const b = opponentTurn(engine, s);
    expect(a).toEqual(b);
    expect(a.session.versus?.rngCount).toBe(1);
    expect(a.session.versus?.turn).toBe("p");
  });
  it("seeds diferentes dão sequências diferentes", () => {
    const moves = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const s = engine.start(`seed-${i}`, "medio");
      moves.add(JSON.stringify(opponentTurn(engine, s).plan));
    }
    expect(moves.size).toBeGreaterThan(1);
  });
  it("não usa a solução para decidir: o plano é igual com respostas trocadas", () => {
    const s = engine.start("seed-x", "dificil");
    const scrambled: Puzzle = structuredClone(puzzle);
    scrambled.words = scrambled.words.map((w) => ({ ...w, answer: w.answer }));
    const plan = planMove(engine, s, "dificil", seededRandom("seed-x", 0));
    const again = planMove(
      new PuzzleEngine(scrambled),
      s,
      "dificil",
      seededRandom("seed-x", 0),
    );
    expect(again).toEqual(plan);
  });
  it("em falha não confirma letras e encerra o turno", () => {
    let failed = false;
    for (let i = 0; i < 200 && !failed; i++) {
      const s = engine.start(`falha-${i}`, "facil");
      const r = opponentTurn(engine, s);
      if (!r.plan.success) {
        failed = true;
        expect(r.session.locked).toEqual(s.locked);
        expect(r.session.scores).toEqual(s.scores);
        expect(r.session.versus?.turn).toBe("p");
      }
    }
    expect(failed).toBe(true);
  });
  it("respeita o limite de letras por nível e usa o motor (dono, pontos, inventário)", () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 25; i++) {
        const s = engine.start(`lim-${level}-${i}`, level);
        const r = opponentTurn(engine, s);
        expect(r.gained).toBeLessThanOrEqual(OPPONENT_LEVELS[level].maxLetters);
        expect(r.session.scores.ai).toBe(r.gained + r.bonus);
        expect(engine.rack.audit(r.session)).toEqual([]);
        for (const cell of r.session.locked)
          expect(r.session.owners[cell]).toBe("ai");
      }
    }
  });
  it("nunca joga com peças pendentes do jogador", () => {
    const s = engine.start("pend", "dificil");
    const pending = engine.insert(s, puzzle.words[0].id, s.rack[0]);
    expect(pending.history).toHaveLength(1);
    expect(
      engine.play(pending, [positions(puzzle.words[0])[0].key], "ai"),
    ).toBeUndefined();
  });
  it("o oponente começa com 5 peças sorteadas da reserva, diferentes das do jogador", () => {
    const hands = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const s = engine.start(`mao-${i}`, "medio");
      expect(s.botRack).toHaveLength(economy.rackStart);
      expect(s.rack).toHaveLength(economy.rackStart);
      for (const id of s.botRack!) expect(s.rack).not.toContain(id);
      expect(engine.rack.audit(s)).toEqual([]);
      hands.add(s.botRack!.map((id) => s.tiles[id].letter).join(""));
    }
    expect(hands.size).toBeGreaterThan(1);
  });
  it("o oponente só coloca letras que tem na mão e volta a ter 5 peças", () => {
    for (let i = 0; i < 40; i++) {
      const s = engine.start(`so-mao-${i}`, "dificil");
      const hand = s.botRack!.map((id) => s.tiles[id].letter).sort();
      const word = puzzle.words[i % puzzle.words.length];
      const played = engine.play(
        s,
        positions(word).map((c) => c.key),
        "ai",
      );
      if (!played) continue;
      const placed = played.session.locked.map(
        (k) => played.session.letters[k],
      );
      // Cada letra colocada saiu da mão (respeitando repetições).
      const pool = [...hand];
      for (const letter of placed) {
        const at = pool.indexOf(letter);
        expect(at).toBeGreaterThanOrEqual(0);
        pool.splice(at, 1);
      }
      expect(played.gained).toBe(placed.length);
      expect(played.session.botRack!.length).toBeLessThanOrEqual(
        economy.rackMax,
      );
      expect(engine.rack.audit(played.session)).toEqual([]);
    }
  });
  it("o jogador não perde peças quando o oponente joga", () => {
    for (let i = 0; i < 25; i++) {
      const s = engine.start(`intacto-${i}`, "dificil");
      const r = opponentTurn(engine, s);
      expect(r.session.rack).toEqual(s.rack);
    }
  });
  it("sem peça útil o oponente troca a mão em vez de ficar parado", () => {
    const s = engine.start("troca", "medio");
    // Trava de graça (como ajuda) toda casa que as peças do oponente poderiam preencher.
    let stuck = s;
    for (let guard = 0; guard < 80 && engine.rack.botHasMove(stuck); guard++) {
      const letters = new Set(
        stuck.botRack!.map((id) => stuck.tiles[id].letter),
      );
      const cell = Object.entries(engine.rack.solution).find(
        ([k, l]) => letters.has(l) && !stuck.locked.includes(k),
      )![0];
      const word = puzzle.words.find((w) =>
        positions(w).some((c) => c.key === cell),
      )!;
      stuck = engine.hint(stuck, word.id) ?? stuck;
      if (stuck === s) break;
    }
    if (!engine.rack.botHasMove(stuck)) {
      const next = opponentTurn(engine, stuck).session;
      expect(next.botRack!.length).toBeGreaterThan(0);
      expect(engine.rack.audit(next)).toEqual([]);
    }
  });
});

/** Jogador-padrão: confirma, a cada vez, até 3 letras de uma palavra qualquer. */
function stubTurn(
  engine: PuzzleEngine,
  s: Session,
  rand: () => number,
): Session {
  const open = engine.puzzle.words.filter((w) =>
    positions(w).some((c) => !s.locked.includes(c.key)),
  );
  if (!open.length) return s;
  const word = open[Math.floor(rand() * open.length)];
  let next = s;
  let placed = 0;
  for (const c of positions(word)) {
    if (next.locked.includes(c.key) || next.letters[c.key] || placed === 3)
      continue;
    const tile = next.rack.find((id) => next.tiles[id].letter === c.letter);
    if (!tile) continue;
    next = engine.insert(next, word.id, tile, c.key);
    placed++;
  }
  return engine.confirm(next, "p").session;
}

function playMatch(puzzle: Puzzle, level: BotLevel, seed: string) {
  const engine = new PuzzleEngine(puzzle);
  const rand = seededRandom(`stub-${seed}`);
  let s = engine.start(seed, level);
  let botTurns = 0;
  for (let turn = 0; turn < 400 && !engine.complete(s); turn++) {
    const confirmed = engine.confirm(stubTurn(engine, s, rand), "p");
    s = { ...confirmed.session, versus: { ...s.versus!, turn: "ai" } };
    s = roundtrip(s);
    if (engine.complete(s)) break;
    s = roundtrip(opponentTurn(engine, s).session);
    botTurns++;
    expect(engine.rack.audit(s)).toEqual([]);
  }
  return { engine, s, botTurns };
}

describe("Partidas completas contra os três níveis", () => {
  it.each(LEVELS)(
    "partida inteira no nível %s termina com inventário íntegro",
    (level) => {
      for (const puzzle of levels) {
        const { engine, s } = playMatch(puzzle, level, `e2e-${level}`);
        expect(engine.complete(s)).toBe(true);
        expect(engine.rack.audit(s)).toEqual([]);
        const cells = Object.keys(engine.rack.solution).length;
        expect(
          Object.keys(s.owners).length + (cells - Object.keys(s.owners).length),
        ).toBe(cells);
        // Todo ponto vem de uma casa confirmada por alguém ou de uma palavra fechada (valor inteiro).
        const owned = Object.values(s.owners);
        const letterPoints = owned.length * economy.letterPoint;
        const bonus = s.scores.p + s.scores.ai - letterPoints;
        const wordTotal = puzzle.words.reduce(
          (n, w) => n + positions(w).length,
          0,
        );
        expect(bonus).toBeGreaterThanOrEqual(0);
        expect(bonus).toBeLessThanOrEqual(wordTotal * economy.letterPoint);
      }
    },
  );
  it("calibração: difícil joga melhor que médio, e médio melhor que fácil", () => {
    const seeds = Array.from({ length: 30 }, (_, i) => `cal-${i}`);
    const stats = Object.fromEntries(
      LEVELS.map((level) => {
        let share = 0;
        let games = 0;
        // Cinco fases bastam para a calibração (são 25, e a conta é por nível e semente).
        for (const puzzle of levels.slice(0, 5))
          for (const seed of seeds) {
            const { s } = playMatch(puzzle, level, seed);
            share += s.scores.ai / (s.scores.ai + s.scores.p);
            games++;
          }
        return [level, share / games];
      }),
    ) as Record<BotLevel, number>;
    expect(stats.dificil).toBeGreaterThan(stats.medio);
    expect(stats.medio).toBeGreaterThan(stats.facil);
  }, 120_000);
  it("partida versus com zero moedas: erros do jogador, passes e bot consumindo o banco", () => {
    const puzzle = levels[0];
    const engine = new PuzzleEngine(puzzle);
    let s = engine.start("zero", "medio");
    const rand = seededRandom("zero-player");
    let coins = 0;
    for (let turn = 0; turn < 400 && !engine.complete(s); turn++) {
      // 1) coloca letras em posições incorretas de propósito
      const wrongWord = puzzle.words[Math.floor(rand() * puzzle.words.length)];
      const emptyCell = positions(wrongWord).find(
        (c) => !s.letters[c.key] && !s.locked.includes(c.key),
      );
      const wrongTile =
        emptyCell &&
        s.rack.find((id) => s.tiles[id].letter !== emptyCell.letter);
      if (emptyCell && wrongTile)
        s = engine.insert(s, wrongWord.id, wrongTile, emptyCell.key);
      // 2) confirma (as erradas voltam ao banco) e, às vezes, só passa a vez
      if (rand() < 0.3) s = stubTurn(engine, s, rand);
      s = {
        ...engine.confirm(s, "p").session,
        versus: { ...s.versus!, turn: "ai" },
      };
      s = roundtrip(s);
      expect(engine.rack.audit(s)).toEqual([]);
      if (engine.complete(s)) break;
      // 3) o bot consome peças do inventário compartilhado
      s = roundtrip(opponentTurn(engine, s).session);
      expect(engine.rack.audit(s)).toEqual([]);
      expect(coins).toBe(0);
    }
    expect(engine.complete(s)).toBe(true);
    expect(
      Object.values(s.tiles).every((t) => t.cell && s.locked.includes(t.cell)),
    ).toBe(true);
  });
});
