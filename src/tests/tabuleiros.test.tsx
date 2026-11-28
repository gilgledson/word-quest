import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Shop } from "../features/Shop";
import { PuzzlePage } from "../features/PuzzlePage";
import { Route, Routes } from "react-router-dom";
import {
  BOARD_IDS,
  BOARD_PRICES,
  BOARD_SCENERY,
  boardArt,
  buyBoard,
  currentBoard,
  wearBoard,
} from "../game/boards";
import { cloudText, mergeCloud, parseCloud, toCloud } from "../game/cloudSave";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
const tracked = vi.hoisted(() => [] as { name: string; params?: object }[]);
vi.mock("../services/telemetry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/telemetry")>();
  return {
    ...mod,
    track: (name: string, params?: object) => tracked.push({ name, params }),
  };
});
afterEach(() => {
  cleanup();
  tracked.length = 0;
});

const base = (coins = 0, patch: Partial<Player> = {}): Player => ({
  ...structuredClone(initialPlayer),
  coins,
  ...patch,
});

describe("Regras dos tabuleiros", () => {
  it("4 temas do mockup, de 300 a 800 moedas, cada um com moldura; a Vila usa o cenário de sempre", () => {
    expect(BOARD_IDS).toEqual(["vila", "floresta", "deserto", "reino"]);
    expect(BOARD_IDS.map((id) => BOARD_PRICES[id])).toEqual([
      300, 450, 600, 800,
    ]);
    expect(boardArt("reino")).toBe("/art/tabuleiros/temas/reino.webp");
    expect(BOARD_SCENERY.vila).toBeUndefined();
    expect(BOARD_SCENERY.deserto).toBe("/art/mundos/deserto.webp");
  });
  it("comprar desconta, guarda e já usa; sem moedas ou já comprado, nada muda", () => {
    const p = buyBoard(base(500), "floresta");
    expect(p).toMatchObject({
      coins: 50,
      boards: ["floresta"],
      board: "floresta",
    });
    expect(currentBoard(p)).toBe("floresta");
    expect(buyBoard(p, "floresta")).toBe(p);
    const poor = base(100);
    expect(buyBoard(poor, "vila")).toBe(poor);
  });
  it("só usa o que comprou; undefined volta ao tabuleiro padrão", () => {
    const p = buyBoard(base(900), "vila");
    expect(wearBoard(p, "reino")).toBe(p);
    expect(currentBoard(wearBoard(p, undefined))).toBeUndefined();
    // Um id gravado sem a compra (ou desconhecido) não vale.
    expect(currentBoard(base(0, { board: "reino" }))).toBeUndefined();
    expect(
      currentBoard(base(0, { boards: ["xpto"], board: "xpto" })),
    ).toBeUndefined();
  });
  it("a nuvem leva os tabuleiros e junta as compras dos dois aparelhos", () => {
    const local = base(0, { boards: ["vila"], board: "vila" });
    const cloud = parseCloud(
      cloudText(base(0, { boards: ["reino", "xpto"], board: "reino" })),
    )!;
    expect(cloud.boards).toEqual(["reino"]);
    const merged = mergeCloud(local, cloud);
    expect(merged.boards?.sort()).toEqual(["reino", "vila"]);
    // O em uso é o do aparelho.
    expect(merged.board).toBe("vila");
    expect(toCloud(base(0)).boards).toBeUndefined();
  });
});

describe("Aba Tabuleiros da loja", () => {
  const open = (coins: number) => {
    usePlayer.setState({ player: base(coins), ready: true });
    render(
      <MemoryRouter initialEntries={["/loja?aba=tabuleiros"]}>
        <Shop />
      </MemoryRouter>,
    );
  };
  it("mostra os 4, compra, passa a usar e mede; dá para voltar ao padrão", () => {
    open(500);
    expect(screen.getByRole("tab", { name: "Tabuleiros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const list = screen.getByRole("list", { name: "Tabuleiros" });
    expect(list.querySelectorAll("li")).toHaveLength(4);
    // Sem moedas para o Deserto (600).
    expect(
      screen.getByRole("button", {
        name: "Comprar o tabuleiro Deserto por 600 moedas",
      }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Comprar o tabuleiro Floresta por 450 moedas",
      }),
    );
    expect(usePlayer.getState().player).toMatchObject({
      coins: 50,
      board: "floresta",
    });
    expect(tracked).toContainEqual({
      name: "board_bought",
      params: expect.objectContaining({ board: "floresta", price: 450 }),
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tabuleiro Floresta comprado e em uso!",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Usar o tabuleiro padrão" }),
    );
    expect(usePlayer.getState().player.board).toBeUndefined();
    expect(tracked).toContainEqual({
      name: "board_used",
      params: { board: "padrao" },
    });
  });
  it("tocar num tabuleiro mostra a prévia dele", () => {
    open(0);
    fireEvent.click(screen.getByRole("button", { name: "Reino" }));
    expect(
      screen.getByRole("region", { name: "Prévia do tabuleiro Reino" }),
    ).toBeInTheDocument();
  });
});

describe("Tabuleiro na partida", () => {
  const play = (patch: Partial<Player>) => {
    usePlayer.setState({
      player: base(100, { tutorialDone: true, tourDone: true, ...patch }),
      ready: true,
    });
    return render(
      <MemoryRouter initialEntries={["/play/vila-1"]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
  };
  it("com tabuleiro comprado, a grade ganha o tema e a moldura", () => {
    const { container } = play({ boards: ["reino"], board: "reino" });
    expect(container.querySelector(".board-card")).toHaveAttribute(
      "data-board",
      "reino",
    );
    const wrap = container.querySelector(".board-wrap");
    expect(wrap).toHaveClass("framed");
    expect(wrap?.getAttribute("style")).toContain(
      "/art/tabuleiros/temas/reino.webp",
    );
    expect(container.querySelector(".board-frame-art")).toBeInTheDocument();
  });
  it("sem tabuleiro (ou sem a compra), a grade de sempre", () => {
    const { container } = play({ board: "reino" });
    expect(container.querySelector(".board-card")).not.toHaveAttribute(
      "data-board",
    );
    expect(container.querySelector(".board-frame-art")).toBeNull();
  });
});
