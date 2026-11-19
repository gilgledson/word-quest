import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dailyPuzzle, levels, today } from "../data/catalog";
import { Daily } from "../features/pages";
import {
  bestWord,
  boardShareText,
  currentStreak,
  dailyShareText,
  STORE_URL,
} from "../game/dailyShare";
import { PuzzleEngine, positions } from "../game/crossword-engine";
import { opponentFor } from "../game/opponents";
import { initialPlayer, type Player } from "../services/repository";
import { REVIEW_GAP_DAYS, shouldAskReview } from "../services/review";
import { usePlayer } from "../stores/player";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Sequência do desafio do dia", () => {
  it("conta os dias seguidos até hoje, ou até ontem se hoje ainda não foi vencido", () => {
    expect(
      currentStreak(["2026-11-14", "2026-11-15", "2026-11-16"], "2026-11-16"),
    ).toBe(3);
    expect(currentStreak(["2026-11-14", "2026-11-15"], "2026-11-16")).toBe(2);
    expect(currentStreak(["2026-11-13", "2026-11-15"], "2026-11-16")).toBe(1);
    expect(currentStreak([], "2026-11-16")).toBe(0);
    // Virada de mês.
    expect(currentStreak(["2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2);
  });
});

describe("Resultado do desafio para compartilhar", () => {
  const puzzle = levels[3];
  const cells = [
    ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
  ];
  // 2 de cada 3 letras do jogador, com uma dica dele e 2 erros.
  const session = {
    owners: Object.fromEntries(
      cells.map((k, i) => [k, i % 3 ? "p" : "ai"] as const),
    ),
    locked: cells,
    scores: { p: 34, ai: 21 },
    hinted: [cells[1]],
    misses: 2,
  };
  const mine = cells.filter((_, i) => i % 3).length;
  const theirs = cells.length - mine;
  const text = dailyShareText({
    date: "2026-11-16",
    session,
    rival: "Raposo",
    streak: 3,
  });
  it("traz data, placar, a barra das letras de cada lado, erros, dicas, sequência e o link", () => {
    expect(text.split("\n")).toEqual([
      "🏆 WordQuest · Desafio de 16/11",
      "⚔️ Vitória sobre Raposo!",
      "",
      "🟦🟦🟦🟦🟦🟦🟦🟥🟥🟥",
      `🟦 minhas letras: ${mine} · 🟥 Raposo: ${theirs}`,
      "",
      "🎯 Pontuação: 34 × 21",
      "❌ 2 erros · 💡 1 dica",
      "🔥 3 dias seguidos",
      "",
      "Consegue me vencer?",
      STORE_URL,
    ]);
  });
  it("não revela nenhuma palavra da grade", () => {
    for (const w of puzzle.words) expect(text).not.toContain(w.answer);
  });
  it("derrota e empate também se compartilham; sequência de 1 dia não aparece", () => {
    const loss = dailyShareText({
      date: "2026-11-16",
      session: {
        ...session,
        scores: { p: 10, ai: 30 },
        hinted: [],
        misses: 0,
      },
      rival: "Raposo",
      streak: 1,
    });
    expect(loss).toContain("😤 Derrota para Raposo");
    expect(loss).toContain("🎯 Pontuação: 10 × 30");
    expect(loss).toContain("✅ sem erros · 💡 sem dicas");
    expect(loss).not.toContain("🔥");
    const draw = dailyShareText({
      date: "2026-11-16",
      session: { ...session, scores: { p: 20, ai: 20 } },
      rival: "Raposo",
      streak: 0,
    });
    expect(draw).toContain("🤝 Empate com Raposo!");
  });
  it("a barra sempre mostra quem fez alguma letra, mesmo pouca", () => {
    const few = dailyShareText({
      date: "2026-11-16",
      session: {
        ...session,
        owners: Object.fromEntries(
          cells.map((k, i) => [k, i === 0 ? "ai" : "p"] as const),
        ),
      },
      rival: "Raposo",
      streak: 0,
    });
    expect(few).toContain("🟦".repeat(9) + "🟥");
  });
});

describe("Tabuleiro compartilhado (Aventura e Casual)", () => {
  const puzzle = levels[3];
  const cells = [
    ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
  ];
  const letterOf = Object.fromEntries(
    puzzle.words.flatMap((w) => positions(w).map((c) => [c.key, c.letter])),
  );
  const owners = Object.fromEntries(
    cells.map((k, i) => [k, i % 3 ? "p" : "ai"] as const),
  );
  const text = boardShareText({
    title: "Fase 4 · Vila das Palavras",
    puzzle,
    session: {
      owners,
      // Uma casa ainda vazia no fim (para conferir o ■).
      locked: cells.slice(1),
      scores: { p: 41, ai: 23 },
    },
    rival: "Fagulha",
  });
  const lines = text.split("\n");
  const board = lines.slice(3, 3 + puzzle.rows);
  /** Símbolos de cada linha, juntando o seletor de texto e o espaço de ajuste ao símbolo. */
  const symbols = (row: string) => [
    ...row.matchAll(/\p{So}[\uFE0E\u2005]?|[^\uFE0E\u2005]/gu),
  ];
  it("cabeçalho, placar, tabuleiro da fase, legenda e link", () => {
    expect(lines.slice(0, 3)).toEqual([
      "🏆 WordQuest · Fase 4 · Vila das Palavras",
      "⚔️ Vitória sobre Fagulha!",
      "",
    ]);
    expect(board).toHaveLength(puzzle.rows);
    for (const row of board) expect(symbols(row)).toHaveLength(puzzle.cols);
    expect(lines.slice(3 + puzzle.rows)).toEqual([
      "Preenchidas: minhas letras · Vazadas: Fagulha",
      "",
      "🎯 Pontuação: 41 × 23",
      `🔥 Melhor palavra: ${bestWord(puzzle, { owners, locked: cells.slice(1) })}`,
      "",
      "Consegue me vencer?",
      STORE_URL,
    ]);
  });
  it("letra do jogador em quadrado preenchido, do rival em vazado, pistas e vazias ■", () => {
    const at = (k: string) => {
      const [r, c] = k.split(",").map(Number);
      return symbols(board[r])[c][0];
    };
    const square = (letter: string, mine: boolean) => {
      const i = letter.normalize("NFD")[0].toUpperCase().charCodeAt(0) - 65;
      const glyph = String.fromCodePoint((mine ? 0x1f170 : 0x1f130) + i);
      return mine && "ABOP".includes(String.fromCharCode(65 + i))
        ? glyph + "\uFE0E"
        : glyph;
    };
    expect(at(cells[0])).toBe("■\u2005");
    expect(at(cells[1])).toBe(square(letterOf[cells[1]], true));
    expect(at(cells[3])).toBe(square(letterOf[cells[3]], false));
    const w = puzzle.words[0];
    expect(at(`${w.clueRow},${w.clueCol}`)).toBe("■\u2005");
    // Nenhuma letra comum: tudo vira símbolo.
    expect(board.join("")).not.toMatch(/[A-Za-zÀ-ú]/);
  });
});

describe("Melhor palavra", () => {
  const puzzle = levels[3];
  const all = (w: (typeof puzzle.words)[number]) =>
    positions(w).map((c) => c.key);
  it("a mais longa feita só pelo jogador; sem nenhuma, a mais longa em que ele pôs letra", () => {
    const longest = [...puzzle.words].sort(
      (a, b) => b.answer.length - a.answer.length,
    )[0];
    const mineOnly = {
      owners: Object.fromEntries(all(longest).map((k) => [k, "p" as const])),
      locked: all(longest),
    };
    expect(bestWord(puzzle, mineOnly)).toBe(longest.answer);
    // Uma letra do rival na palavra: ela deixa de ser "só dele", mas ainda conta como última opção.
    const shared = {
      owners: { ...mineOnly.owners, [all(longest)[0]]: "ai" as const },
      locked: all(longest),
    };
    expect(bestWord(puzzle, shared)).toBeDefined();
    expect(bestWord(puzzle, { owners: {}, locked: [] })).toBeUndefined();
  });
});

describe("Tela do Desafio do Dia", () => {
  /** Jogador que já fechou a grade de hoje (todas as letras dele). */
  function finishedToday(): Player {
    const date = today();
    const puzzle = dailyPuzzle(date);
    const rival = opponentFor({
      puzzleId: puzzle.id,
      number: puzzle.number,
      mode: "daily",
      date,
    });
    const engine = new PuzzleEngine(puzzle);
    const key = `daily:${date}:${rival.level}`;
    const cells = [
      ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
    ];
    const done = engine.play(
      engine.start(key, rival.level),
      cells,
      "p",
    )!.session;
    return {
      ...structuredClone(initialPlayer),
      daily: [date],
      sessions: { [key]: done },
    };
  }
  const open = (player: Player) => {
    usePlayer.setState({ player, ready: true });
    render(
      <MemoryRouter>
        <Daily />
      </MemoryRouter>,
    );
  };
  it("antes de jogar, só o botão de jogar", () => {
    open(structuredClone(initialPlayer));
    expect(
      screen.queryByRole("button", { name: /Compartilhar resultado/ }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /Jogar o desafio de hoje/ }),
    ).toBeInTheDocument();
  });
  it("depois de jogar, compartilha o resultado (sem folha do sistema, copia o texto)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
      share: undefined,
    });
    open(finishedToday());
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Compartilhar resultado/ }),
      );
    });
    expect(writeText).toHaveBeenCalledOnce();
    const shared = writeText.mock.calls[0][0] as string;
    expect(shared).toMatch(/^🏆 WordQuest · Desafio de \d\d\/\d\d/);
    expect(shared).toContain(STORE_URL);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Resultado copiado",
    );
    expect(
      screen.getByRole("link", { name: /Revisitar desafio/ }),
    ).toBeInTheDocument();
  });
});

describe("Pedido de avaliação na loja", () => {
  const day = 86_400_000;
  const now = Date.parse("2026-11-16T12:00:00Z");
  const player = (asks: string[] = []): Player => ({
    ...structuredClone(initialPlayer),
    reviewAsks: asks,
  });
  it("só a partir da 3ª fase vencida", () => {
    expect(shouldAskReview(player(), 2, now)).toBe(false);
    expect(shouldAskReview(player(), 3, now)).toBe(true);
  });
  it("espera 45 dias entre pedidos e para depois de 3", () => {
    const recent = new Date(now - 10 * day).toISOString();
    const old = new Date(now - REVIEW_GAP_DAYS * day).toISOString();
    expect(shouldAskReview(player([recent]), 8, now)).toBe(false);
    expect(shouldAskReview(player([old]), 8, now)).toBe(true);
    expect(shouldAskReview(player([old, old, old]), 8, now)).toBe(false);
  });
});

describe("Fim de fase da Aventura", () => {
  it("o painel do fim mostra Compartilhar resultado com o tabuleiro da fase", async () => {
    const { Route, Routes } = await import("react-router-dom");
    const { PuzzlePage } = await import("../features/PuzzlePage");
    const puzzle = levels[0];
    const engine = new PuzzleEngine(puzzle);
    const key = `vs:${puzzle.id}:facil`;
    const cells = [
      ...new Set(puzzle.words.flatMap((w) => positions(w).map((c) => c.key))),
    ];
    const done = {
      ...engine.play(engine.start(key, "facil"), cells, "p")!.session,
      claimed: true,
    };
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        tutorialDone: true,
        tourDone: true,
        sessions: { [key]: done },
      },
      ready: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
      share: undefined,
    });
    render(
      <MemoryRouter initialEntries={[`/play/${puzzle.id}?vs=facil`]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {
      fireEvent.click(
        await screen.findByRole("button", { name: /Compartilhar resultado/ }),
      );
    });
    const shared = writeText.mock.calls[0][0] as string;
    expect(shared).toMatch(/^🏆 WordQuest · Fase 1 · Vila das Palavras/);
    expect(shared).toContain("Preenchidas: minhas letras");
  });
});
