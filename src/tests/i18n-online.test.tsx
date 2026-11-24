import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../i18n";
import { BOARD_SIZES, inviteText, turnLabel } from "../game/online";
import {
  memoryBackend,
  onlineErrorText,
  setOnlineBackend,
} from "../services/online";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
import { OnlineSetup } from "../features/OnlinePage";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

describe("duelo ao vivo em inglês", () => {
  beforeEach(() => {
    setLang("en");
    setOnlineBackend(memoryBackend().as("host"));
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), name: "Gil", coins: 40 },
      ready: true,
    });
  });
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
    setLang("pt");
  });

  it("textos auxiliares e tamanhos de tabuleiro mudam com o idioma", () => {
    expect(BOARD_SIZES.map((s) => s.nome)).toEqual([
      "Quick",
      "Light",
      "Medium",
      "Long",
    ]);
    expect(BOARD_SIZES[1].tempo).toBe("~1.5 min");
    expect(turnLabel(0)).toBe("No limit");
    expect(inviteText("ABC234")).toContain("enter the code ABC234");
    expect(onlineErrorText(new Error("x"))).toMatch(/Check your connection/);
    setLang("pt");
    expect(BOARD_SIZES[0].nome).toBe("Rápido");
  });

  it("a configuração da partida aparece em inglês", () => {
    render(
      <MemoryRouter initialEntries={["/online/nova"]}>
        <Routes>
          <Route path="online/nova" element={<OnlineSetup />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Set up match" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Board size")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /7×7, Medium, about 2 min/ }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: /Create match/ })).toBeVisible();
    expect(
      screen.getByText("No bet this match. You have 40 coins."),
    ).toBeInTheDocument();
  });
});
