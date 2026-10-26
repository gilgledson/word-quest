import fs from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { levels } from "../data/catalog";
import { PuzzlePage } from "../features/PuzzlePage";
import {
  PuzzleEngine,
  seededRandom,
  type BotLevel,
} from "../game/crossword-engine";
import {
  OPPONENT_LEVELS,
  OPPONENT_STYLES,
  opponentTurn,
  successChance,
} from "../game/opponent";
import {
  MOODS,
  OPPONENTS,
  OPPONENT_BY_LEVEL,
  defaultOpponent,
  opponentById,
  opponentFace,
  opponentFor,
  opponentOfSession,
} from "../game/opponents";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);
const LEVELS: BotLevel[] = ["facil", "medio", "dificil"];

describe("Elenco de oponentes", () => {
  it("são onze: seis base (dois por nível, um cuidadoso e um agressivo) e cinco chefes", () => {
    expect(OPPONENTS).toHaveLength(11);
    expect(new Set(OPPONENTS.map((o) => o.id)).size).toBe(11);
    expect(new Set(OPPONENTS.map((o) => o.name)).size).toBe(11);
    const base = OPPONENTS.filter((o) => !o.boss);
    expect(base).toHaveLength(6);
    for (const level of LEVELS)
      expect(
        base
          .filter((o) => o.level === level)
          .map((o) => o.style)
          .sort(),
      ).toEqual(["agressivo", "cuidadoso"]);
    expect(OPPONENTS.filter((o) => o.boss)).toHaveLength(5);
  });
  it("cada um tem rosto em todos os humores, frase e falas de vitória e derrota", () => {
    expect(MOODS).toEqual([
      "neutral",
      "thinking",
      "happy",
      "angry",
      "sad",
      "surprised",
    ]);
    for (const o of OPPONENTS) {
      for (const mood of MOODS)
        expect(fs.existsSync(`public${opponentFace(o.id, mood)}`)).toBe(true);
      for (const text of [o.tagline, o.win, o.lose])
        expect(text.length).toBeGreaterThan(3);
    }
  });
  it("partidas antigas, sem personagem, usam o cuidadoso do nível", () => {
    for (const level of LEVELS) {
      expect(defaultOpponent(level)).toMatchObject({
        level,
        style: "cuidadoso",
      });
      expect(opponentOfSession({ level })).toBe(defaultOpponent(level));
    }
    expect(opponentById("nao-existe")).toBeUndefined();
    expect(opponentOfSession({ level: "medio", opponent: "draco" }).id).toBe(
      "draco",
    );
  });
});

describe("Estilos de jogo", () => {
  it("o agressivo acerta menos por palavra do que o cuidadoso, no mesmo nível", () => {
    for (const level of LEVELS)
      for (const [filled, length] of [
        [0, 5],
        [3, 6],
        [2, 4],
      ])
        expect(successChance(level, filled, length, "agressivo")).toBeLessThan(
          successChance(level, filled, length, "cuidadoso"),
        );
  });
  it("sem estilo vale o nível puro (partidas antigas não mudam)", () => {
    expect(successChance("medio", 2, 5)).toBeCloseTo(
      OPPONENT_LEVELS.medio.base + 0.4 * (2 / 5) - 0.035 * 5,
      10,
    );
  });
  it("o estilo fica gravado na sessão e a jogada é determinística (recarregar repete)", () => {
    const engine = new PuzzleEngine(levels[0]);
    const s = engine.start("e", "medio", {
      style: "agressivo",
      opponent: "raposo",
    });
    expect(s.versus).toMatchObject({ style: "agressivo", opponent: "raposo" });
    const again = JSON.parse(JSON.stringify(s));
    expect(JSON.stringify(opponentTurn(engine, s))).toBe(
      JSON.stringify(opponentTurn(engine, again)),
    );
  });
  it("o agressivo põe mais letras por turno e a força continua ordenada pelo nível", () => {
    const stats = OPPONENTS.map((o) => {
      let share = 0;
      let games = 0;
      let turns = 0;
      let played = 0;
      for (const puzzle of levels.slice(0, 4))
        for (let i = 0; i < 12; i++) {
          const engine = new PuzzleEngine(puzzle);
          let s = engine.start(`c${i}`, o.level, {
            style: o.style,
            opponent: o.id,
          });
          const rand = seededRandom(`stub-${i}`);
          for (let t = 0; t < 400 && !engine.complete(s); t++) {
            // O jogador de teste confirma uma letra certa por turno.
            const open = Object.keys(engine.rack.solution).filter(
              (k) => !s.locked.includes(k),
            );
            const copy = JSON.parse(JSON.stringify(s));
            const cell = open[Math.floor(rand() * open.length)];
            if (engine.rack.lockCell(copy, cell, "p")) {
              copy.scores.p += 1;
              s = copy;
            }
            s = { ...s, versus: { ...s.versus, turn: "ai" } };
            if (engine.complete(s)) break;
            const before = s.locked.length;
            const r = opponentTurn(engine, s);
            turns++;
            played += r.session.locked.length - before;
            s = r.session;
          }
          share += s.scores.ai / Math.max(1, s.scores.ai + s.scores.p);
          games++;
        }
      return { o, share: share / games, perTurn: played / turns };
    });
    const by = (id: string) => stats.find((x) => x.o.id === id)!;
    for (const level of LEVELS) {
      const [careful, bold] = ["cuidadoso", "agressivo"].map((style) =>
        stats.find((x) => x.o.level === level && x.o.style === style)!,
      );
      expect(bold.perTurn).toBeGreaterThan(careful.perTurn);
    }
    // Os dois de um nível ficam sempre abaixo dos dois do nível seguinte.
    const top = (level: BotLevel) =>
      Math.max(...stats.filter((x) => x.o.level === level).map((x) => x.share));
    const bottom = (level: BotLevel) =>
      Math.min(...stats.filter((x) => x.o.level === level).map((x) => x.share));
    expect(top("facil")).toBeLessThan(bottom("medio"));
    expect(top("medio")).toBeLessThan(bottom("dificil"));
    void by;
    void OPPONENT_STYLES;
  }, 120_000);
});

describe("Oponente de cada fase", () => {
  it("as 25 fases têm oponente fixo e a 5ª de cada mundo é um chefe", () => {
    expect(levels).toHaveLength(25);
    for (const l of levels) {
      const o = opponentById(OPPONENT_BY_LEVEL[l.number]);
      expect(o, `fase ${l.number}`).toBeTruthy();
      expect(
        opponentFor({
          puzzleId: l.id,
          number: l.number,
          mode: "campaign",
        }),
      ).toBe(o);
    }
    for (const n of [5, 10, 15, 20, 25])
      expect(opponentById(OPPONENT_BY_LEVEL[n])!.boss).toBe(true);
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9])
      expect(opponentById(OPPONENT_BY_LEVEL[n])!.boss).toBeUndefined();
  });
  it("a dificuldade sobe de mundo em mundo (média do nível dos oponentes)", () => {
    const rank = { facil: 1, medio: 2, dificil: 3 } as const;
    const avg = (from: number) =>
      [0, 1, 2, 3, 4].reduce(
        (n, i) => n + rank[opponentById(OPPONENT_BY_LEVEL[from + i])!.level],
        0,
      ) / 5;
    const worlds = [1, 6, 11, 16, 21].map(avg);
    for (let i = 1; i < worlds.length; i++)
      expect(worlds[i]).toBeGreaterThanOrEqual(worlds[i - 1]);
    expect(worlds[4]).toBeGreaterThan(worlds[0]);
  });
  it("o diário é estável pela data e o casual segue o sorteio da URL", () => {
    const d = (date: string) =>
      opponentFor({ puzzleId: "x", number: 1, mode: "daily", date }).id;
    expect(d("2026-10-25")).toBe(d("2026-10-25"));
    expect(
      new Set(
        [
          "2026-10-01",
          "2026-10-02",
          "2026-10-03",
          "2026-10-04",
          "2026-10-05",
        ].map(d),
      ).size,
    ).toBeGreaterThan(1);
    expect(
      opponentFor({
        puzzleId: "casual-animais-1",
        number: 1,
        mode: "casual",
        override: "polvo",
      }).id,
    ).toBe("polvo");
    // `vs` também aceita um nível (uso de testes e depuração).
    expect(
      opponentFor({
        puzzleId: "vila-1",
        number: 1,
        mode: "campaign",
        override: "dificil",
      }).level,
    ).toBe("dificil");
  });
});

describe("Oponente na partida", () => {
  const open = (path: string) => {
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        // As fases anteriores já vencidas, para a fase pedida estar liberada.
        stars: Object.fromEntries(levels.map((l) => [l.id, 1])),
      },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
  };
  it("a fase 1 é contra o Bolota: nome e rosto no placar, sem escolha", () => {
    open("/play/vila-1");
    expect(screen.getByLabelText("Placar")).toHaveTextContent("Bolota");
    const face = document.querySelector<HTMLImageElement>(
      ".duelist.rival .opponent-avatar",
    )!;
    expect(face.src).toContain("/art/opponents/bolota-");
  });
  it("o chefe do primeiro mundo (fase 5) é o Mestre Cuco", () => {
    open("/play/vila-5");
    expect(screen.getByLabelText("Placar")).toHaveTextContent("Cuco");
  });
  it("o parâmetro vs força outro oponente (só para testes) e a sessão grava o personagem", () => {
    open("/play/vila-1?vs=raposo");
    expect(screen.getByLabelText("Placar")).toHaveTextContent("Raposo");
    fireEvent.click(document.querySelector('[data-cell="1,1"]')!);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra / })[0],
    );
    const stored = Object.values(usePlayer.getState().player.sessions)[0];
    expect(stored.versus).toMatchObject({
      opponent: "raposo",
      style: "agressivo",
    });
  });
  it("partida em andamento continua com o mesmo oponente ao reabrir", () => {
    open("/play/vila-1?vs=fagulha");
    fireEvent.click(document.querySelector('[data-cell="1,1"]')!);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Inserir letra / })[0],
    );
    cleanup();
    render(
      <MemoryRouter initialEntries={["/play/vila-1?vs=fagulha"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Placar")).toHaveTextContent("Fagulha");
  });
});
