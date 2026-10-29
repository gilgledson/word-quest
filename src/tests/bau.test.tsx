import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { Campaign } from "../features/pages";
import { ResultPopup } from "../features/ResultPopup";
import { VictoryPanel } from "../features/puzzle/VictoryPanel";
import { settleSession } from "../features/puzzle/settleSession";
import { levels, maps, worldLevels } from "../data/catalog";
import { OPPONENTS } from "../game/opponents";
import { PuzzleEngine, economy, type Session } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);

/** Sessão já terminada com vitória do jogador (todas as casas travadas e placar 20×3). */
function wonSession(puzzleIndex: number) {
  const puzzle = levels[puzzleIndex];
  const engine = new PuzzleEngine(puzzle);
  const s = engine.start(`vs:${puzzle.id}:facil`, "facil");
  for (const k of Object.keys(engine.rack.solution))
    engine.rack.lockCell(s, k, "p");
  s.scores = { p: 20, ai: 3 };
  return { engine, puzzle, s: s as Session };
}
const ctx = (
  e: PuzzleEngine,
  id: string,
  chest?: { world: string; coins: number },
) => ({
  engine: e,
  puzzleId: id,
  sessionKey: `vs:${id}:facil`,
  daily: false,
  casual: false,
  date: "2026-10-28",
  chest,
});
const bossChest = (i: number) => ({
  world: maps[i].id,
  coins: economy.chest[i],
});

describe("baú do mundo", () => {
  it("os prêmios são fixos e crescem a cada mundo", () => {
    expect(economy.chest).toEqual([50, 75, 100, 125, 150]);
    expect(economy.chest).toHaveLength(maps.length);
  });
  it("vencer o chefe abre o baú: moedas do duelo + moedas do baú, uma vez por mundo", () => {
    const vila = worldLevels("vila");
    const boss = vila[vila.length - 1];
    const { engine, s } = wonSession(levels.indexOf(boss));
    const before = { ...structuredClone(initialPlayer), coins: 100 };
    const after = settleSession(
      before,
      s,
      0,
      ctx(engine, boss.id, bossChest(0)),
    );
    expect(after.coins).toBe(100 + economy.duel.win + 50);
    expect(after.chests).toEqual(["vila"]);
    expect(after.sessions[`vs:${boss.id}:facil`].chest).toBe(50);
  });
  it("jogar o chefe de novo depois de aberto não paga o baú outra vez", () => {
    const vila = worldLevels("vila");
    const boss = vila[vila.length - 1];
    const { engine, s } = wonSession(levels.indexOf(boss));
    const jaAberto = {
      ...structuredClone(initialPlayer),
      coins: 100,
      chests: ["vila"],
    };
    const after = settleSession(
      jaAberto,
      s,
      0,
      ctx(engine, boss.id, bossChest(0)),
    );
    expect(after.coins).toBe(100 + economy.duel.win);
    expect(after.chests).toEqual(["vila"]);
    expect(after.sessions[`vs:${boss.id}:facil`].chest).toBeUndefined();
  });
  it("derrota ou empate no chefe não abre o baú", () => {
    const vila = worldLevels("vila");
    const boss = vila[vila.length - 1];
    const { engine, s } = wonSession(levels.indexOf(boss));
    s.scores = { p: 5, ai: 9 };
    const after = settleSession(
      structuredClone(initialPlayer),
      s,
      0,
      ctx(engine, boss.id, bossChest(0)),
    );
    expect(after.chests).toEqual([]);
    expect(after.coins).toBe(initialPlayer.coins + economy.duel.loss);
  });
  it("fases comuns (sem baú no contexto) não abrem baú", () => {
    const { engine, puzzle, s } = wonSession(0);
    const after = settleSession(
      structuredClone(initialPlayer),
      s,
      0,
      ctx(engine, puzzle.id),
    );
    expect(after.chests).toEqual([]);
    expect(after.sessions[`vs:${puzzle.id}:facil`].chest).toBeUndefined();
  });
  it("jogadores salvos antes do baú (sem a lista) continuam funcionando", () => {
    const vila = worldLevels("vila");
    const boss = vila[vila.length - 1];
    const { engine, s } = wonSession(levels.indexOf(boss));
    const antigo = { ...structuredClone(initialPlayer), coins: 10 } as Partial<
      typeof initialPlayer
    >;
    delete antigo.chests;
    const after = settleSession(
      antigo as typeof initialPlayer,
      s,
      0,
      ctx(engine, boss.id, bossChest(0)),
    );
    expect(after.chests).toEqual(["vila"]);
  });
});

describe("abertura do baú na tela", () => {
  const base = {
    result: "win" as const,
    rival: OPPONENTS[0],
    mood: "happy" as const,
    moodKey: 1,
    scores: { p: 20, ai: 3 },
    coins: 50,
    stars: 1,
    enabled: false,
    onClose: () => {},
  };
  it("a janela de vitória mostra o baú aberto com as moedas", () => {
    render(
      <MemoryRouter>
        <ResultPopup {...base} chest={75} />
      </MemoryRouter>,
    );
    const baú = screen
      .getByText("Baú do mundo aberto!")
      .closest(".chest-reward")!;
    expect(baú).toHaveTextContent("+75 moedas");
  });
  it("sem baú, a janela fica como antes", () => {
    render(
      <MemoryRouter>
        <ResultPopup {...base} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Baú do mundo aberto!")).toBeNull();
  });
  it("o painel de vitória também mostra o baú", () => {
    render(
      <MemoryRouter>
        <VictoryPanel
          result="win"
          daily={false}
          casual={false}
          rivalName="Cuco"
          scores={{ p: 20, ai: 3 }}
          level="facil"
          animated={false}
          fxEnabled={false}
          chest={50}
          backTo="/map"
          onNext={() => {}}
          onReplay={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Baú do mundo aberto!")).toBeInTheDocument();
  });
  it("o mapa avisa do baú no chefe e some depois de aberto", () => {
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    const { unmount } = render(
      <MemoryRouter>
        <Campaign world="vila" />
      </MemoryRouter>,
    );
    expect(document.querySelector(".boss-prize")).toHaveTextContent("+50");
    expect(
      screen.getByRole("link", { name: /chefe .*baú de 50 moedas/ }),
    ).toBeInTheDocument();
    unmount();
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), chests: ["vila"] },
      ready: true,
    });
    render(
      <MemoryRouter>
        <Campaign world="vila" />
      </MemoryRouter>,
    );
    expect(document.querySelector(".boss-prize")).toBeNull();
  });
});
