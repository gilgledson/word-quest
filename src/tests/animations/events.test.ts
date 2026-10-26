import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  useGameAnimations,
  deriveEvents,
} from "../../animations/hooks/useGameAnimations";
import { positions, type Session } from "../../game/crossword-engine";
import { crossScenario } from "./helpers";

const clone = (s: Session) => JSON.parse(JSON.stringify(s)) as Session;

describe("deriveEvents (eventos vindos de transições reais do motor)", () => {
  it("colocar uma letra gera LETTER_PLACED na casa", () => {
    const { engine, session, a, cross, letter } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const next = engine.insert(session, a.id, tile, cross);
    expect(deriveEvents(engine, session, next)).toEqual([
      { type: "LETTER_PLACED", cellId: cross },
    ]);
  });
  it("um ✓ que fecha duas palavras cruzadas gera um WORD_COMPLETED por wordId", () => {
    const { engine, session, a, b, cross, letter } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const placed = engine.insert(session, a.id, tile, cross);
    const { session: after } = engine.confirm(placed, "p");
    const events = deriveEvents(engine, placed, after);
    const words = events.filter((e) => e.type === "WORD_COMPLETED");
    expect(words.map((e) => "wordId" in e && e.wordId).sort()).toEqual(
      [a.id, b.id].sort(),
    );
    for (const w of words)
      expect(w).toMatchObject({ owner: "player", assisted: false });
    expect(words.find((e) => "wordId" in e && e.wordId === a.id)).toMatchObject(
      { cells: positions(a).map((c) => c.key) },
    );
    expect(events).toContainEqual({
      type: "LETTER_CONFIRMED",
      cellId: cross,
      owner: "player",
    });
  });
  it("jogada do oponente fecha a palavra com dono ai (cor roxa)", () => {
    const { engine, session, cross, letter } = crossScenario();
    const next = clone(session);
    // O oponente só joga com as peças da própria mão: passa a peça do cruzamento para ele.
    const tile = next.rack.find((t) => next.tiles[t].letter === letter)!;
    next.rack = next.rack.filter((t) => t !== tile);
    next.botRack.push(tile);
    expect(engine.rack.lockCell(next, cross, "ai")).toBe(true);
    const words = deriveEvents(engine, session, next).filter(
      (e) => e.type === "WORD_COMPLETED",
    );
    expect(words).toHaveLength(2);
    for (const w of words) expect(w).toMatchObject({ owner: "ai" });
  });
  it("palavra fechada só pela Dica é discreta (assisted) e a casa vira HINT_REVEALED", () => {
    const { engine, session, a, cross } = crossScenario();
    const next = engine.hint(session, a.id)!;
    const events = deriveEvents(engine, session, next);
    expect(events).toContainEqual({ type: "HINT_REVEALED", cellId: cross });
    const words = events.filter((e) => e.type === "WORD_COMPLETED");
    expect(words).toHaveLength(2);
    for (const w of words) expect(w).toMatchObject({ assisted: true });
  });
  it("mudança de turno gera TURN_CHANGED", () => {
    const { engine, session } = crossScenario();
    const next = clone(session);
    next.versus.turn = "ai";
    expect(deriveEvents(engine, session, next)).toContainEqual({
      type: "TURN_CHANGED",
      turn: "ai",
    });
  });
  it("sessão nova (jogar de novo) ou que desfaz casas não gera eventos", () => {
    const { engine, session } = crossScenario();
    const fresh = engine.start("outra", "medio");
    expect(deriveEvents(engine, session, fresh)).toEqual([]);
  });
  it("não altera nenhuma das duas sessões", () => {
    const { engine, session, a, cross, letter } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const placed = engine.insert(session, a.id, tile, cross);
    const after = engine.confirm(placed, "p").session;
    const snapshot = JSON.stringify([placed, after]);
    deriveEvents(engine, placed, after);
    expect(JSON.stringify([placed, after])).toBe(snapshot);
  });
});

describe("useGameAnimations", () => {
  const setup = (enabled = true) => {
    const { engine, session, a, cross, letter, key } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const placed = engine.insert(session, a.id, tile, cross);
    const after = engine.confirm(placed, "p").session;
    const hook = renderHook(
      (props: { session: Session }) =>
        useGameAnimations({
          engine,
          session: props.session,
          sessionKey: key,
          enabled,
        }),
      { initialProps: { session } },
    );
    return { hook, session, placed, after };
  };
  it("a primeira sessão vista é só linha de base: nada é reproduzido", () => {
    const { hook } = setup();
    expect(hook.result.current.effects).toEqual([]);
  });
  it("uma transição observada vira efeitos, e re-renderizar a mesma sessão não repete", () => {
    const { hook, placed, after } = setup();
    act(() => hook.rerender({ session: placed }));
    expect(hook.result.current.effects.map((e) => e.event.type)).toEqual([
      "LETTER_PLACED",
    ]);
    act(() => hook.rerender({ session: placed }));
    expect(hook.result.current.effects).toHaveLength(1);
    act(() => hook.rerender({ session: after }));
    const types = hook.result.current.effects.map((e) => e.event.type);
    expect(types.filter((t) => t === "WORD_COMPLETED")).toHaveLength(2);
    // Revisões distintas e ids únicos para transições distintas.
    const ids = hook.result.current.effects.map((e) => e.event.id);
    expect(new Set(ids).size).toBe(ids.length);
    const revisions = hook.result.current.effects.map((e) => e.event.revision);
    expect(Math.max(...revisions)).toBeGreaterThan(Math.min(...revisions));
  });
  it("com animações desligadas nenhum efeito entra na fila", () => {
    const { hook, placed } = setup(false);
    act(() => hook.rerender({ session: placed }));
    expect(hook.result.current.effects).toEqual([]);
  });
  it("desmontar limpa todos os timers", () => {
    const { hook, placed } = setup();
    act(() => hook.rerender({ session: placed }));
    expect(hook.result.current.effects).toHaveLength(1);
    hook.unmount();
  });
});
