import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOOD_HOLD,
  finalMood,
  reactionTo,
  useOpponentMood,
} from "../../animations/hooks/useOpponentMood";
import { OpponentPortrait } from "../../components/OpponentPortrait";
import type { Session } from "../../game/crossword-engine";
import { opponentById } from "../../game/opponents";
import { crossScenario, load, mountWithLayout } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const clone = (s: Session) => JSON.parse(JSON.stringify(s)) as Session;

describe("Reação do oponente (reactionTo)", () => {
  it("o jogador fecha uma palavra na frente: o oponente fica com raiva", () => {
    const { engine, session, a, cross, letter } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const placed = engine.insert(session, a.id, tile, cross);
    const after = engine.confirm(placed, "p").session;
    expect(reactionTo(engine, placed, after)).toBe("angry");
  });
  it("o jogador fecha a palavra mas o oponente está na frente: surpreso", () => {
    const { engine, session, a, cross, letter } = crossScenario();
    const tile = session.rack.find((t) => session.tiles[t].letter === letter)!;
    const base = clone(session);
    base.scores.ai = 99;
    const placed = engine.insert(base, a.id, tile, cross);
    const after = engine.confirm(placed, "p").session;
    expect(reactionTo(engine, placed, after)).toBe("surprised");
  });
  it("o oponente pontua: feliz; passa a vez sem nada: com raiva; começa a pensar: pensando", () => {
    const { engine, session, cross, letter } = crossScenario();
    const aiTurn = clone(session);
    aiTurn.versus.turn = "ai";
    expect(reactionTo(engine, session, aiTurn)).toBe("thinking");
    const played = clone(aiTurn);
    const tile = played.rack.find((t) => played.tiles[t].letter === letter)!;
    played.rack = played.rack.filter((t) => t !== tile);
    played.botRack.push(tile);
    engine.rack.lockCell(played, cross, "ai");
    played.versus.turn = "p";
    expect(reactionTo(engine, aiTurn, played)).toBe("happy");
    const passed = clone(aiTurn);
    passed.versus.turn = "p";
    expect(reactionTo(engine, aiTurn, passed)).toBe("angry");
  });
  it("fim de jogo: quem ganha, o oponente comemora; quem perde, fica triste; empate, surpreso", () => {
    expect(finalMood({ scores: { p: 3, ai: 9 } })).toBe("happy");
    expect(finalMood({ scores: { p: 9, ai: 3 } })).toBe("sad");
    expect(finalMood({ scores: { p: 5, ai: 5 } })).toBe("surprised");
  });
  it("sem mudança relevante não há reação", () => {
    const { engine, session } = crossScenario();
    expect(reactionTo(engine, session, clone(session))).toBeNull();
  });
});

describe("useOpponentMood", () => {
  const setup = () => {
    const sc = crossScenario();
    const hook = renderHook(
      (p: { session: Session; botTurn: boolean; enabled?: boolean }) =>
        useOpponentMood({ engine: sc.engine, ...p }),
      {
        initialProps: { session: sc.session, botTurn: false } as {
          session: Session;
          botTurn: boolean;
          enabled?: boolean;
        },
      },
    );
    return { sc, hook };
  };
  it("a primeira sessão é só linha de base: começa neutro", () => {
    const { hook } = setup();
    expect(hook.result.current.mood).toBe("neutral");
  });
  it("reage, mantém por um tempo e volta ao neutro", () => {
    const { sc, hook } = setup();
    const aiTurn = clone(sc.session);
    aiTurn.versus.turn = "ai";
    act(() => hook.rerender({ session: aiTurn, botTurn: true }));
    expect(hook.result.current.mood).toBe("thinking");
    const done = clone(aiTurn);
    done.versus.turn = "p";
    act(() => hook.rerender({ session: done, botTurn: false }));
    expect(hook.result.current.mood).toBe("angry");
    const key = hook.result.current.key;
    act(() => void vi.advanceTimersByTime(MOOD_HOLD + 50));
    expect(hook.result.current.mood).toBe("neutral");
    expect(key).toBeGreaterThan(0);
  });
  it("animações desligadas: o humor não muda no meio da partida", () => {
    const { sc, hook } = setup();
    const aiTurn = clone(sc.session);
    aiTurn.versus.turn = "ai";
    act(() =>
      hook.rerender({ session: aiTurn, botTurn: false, enabled: false }),
    );
    expect(hook.result.current.mood).toBe("neutral");
  });
  it("partida já terminada ao abrir mostra o humor final do oponente", () => {
    const sc = crossScenario();
    const done = clone(sc.session);
    // Tabuleiro todo confirmado (o inventário não importa aqui; só o fim de jogo).
    for (const [k, letter] of Object.entries(sc.engine.rack.solution)) {
      done.letters[k] = letter;
      if (!done.locked.includes(k)) done.locked.push(k);
    }
    done.scores = { p: 40, ai: 10 };
    const hook = renderHook(() =>
      useOpponentMood({ engine: sc.engine, session: done, botTurn: false }),
    );
    expect(hook.result.current.mood).toBe("sad");
  });
});

describe("OpponentPortrait", () => {
  const polvo = opponentById("polvo")!;
  it("mostra o rosto do humor, com a classe da animação e o balãozinho", () => {
    render(<OpponentPortrait opponent={polvo} mood="angry" moodKey={3} />);
    const p = screen.getByTestId("opponent-portrait");
    expect(p).toHaveClass("mood-angry", "animated");
    expect(p.querySelector("img")!.getAttribute("src")).toBe(
      "/art/opponents/polvo-angry.webp",
    );
    expect(p.querySelector(".portrait-bubble")).toBeInTheDocument();
  });
  it("sem animações não há classe animada nem balão, mas o rosto muda", () => {
    render(<OpponentPortrait opponent={polvo} mood="sad" animate={false} />);
    const p = screen.getByTestId("opponent-portrait");
    expect(p).not.toHaveClass("animated");
    expect(p.querySelector(".portrait-bubble")).toBeNull();
    expect(p.querySelector("img")!.getAttribute("src")).toContain("polvo-sad");
  });
  it("se a arte do humor falhar, volta ao rosto neutro", () => {
    render(<OpponentPortrait opponent={polvo} mood="happy" />);
    const img = screen
      .getByTestId("opponent-portrait")
      .querySelector("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toContain("polvo-neutral.webp");
  });
});

describe("Rosto do oponente na partida", () => {
  it("começa neutro e fechar uma palavra deixa o oponente com raiva", () => {
    const sc = crossScenario();
    load(sc.key, sc.session);
    mountWithLayout(sc.puzzle.id);
    expect(
      within(screen.getByTestId("duelist-rival")).getByTestId(
        "opponent-portrait",
      ),
    ).toHaveAttribute("data-mood", "neutral");
    fireEvent.click(document.querySelector(`[data-cell="${sc.cross}"]`)!);
    fireEvent.click(
      screen.getAllByRole("button", { name: `Inserir letra ${sc.letter}` })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    // Fechou duas palavras: o oponente fica bravo, e depois passa a pensar na vez dele.
    expect(
      within(screen.getByTestId("duelist-rival")).getByTestId(
        "opponent-portrait",
      ),
    ).toHaveAttribute("data-mood", "angry");
    // Passado um instante, ainda bravo: a vez dele (900 ms) só começa depois.
    act(() => void vi.advanceTimersByTime(300));
    expect(
      within(screen.getByTestId("duelist-rival")).getByTestId(
        "opponent-portrait",
      ),
    ).toHaveAttribute("data-mood", "angry");
  });
});
