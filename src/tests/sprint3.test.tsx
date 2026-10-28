import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, it, expect } from "vitest";
import { Campaign, Casual, Daily, Profile } from "../features/pages";
import { ResultPopup } from "../features/ResultPopup";
import { levels, today } from "../data/catalog";
import { OPPONENTS } from "../game/opponents";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(() => cleanup());
const open = (ui: React.ReactElement, patch = {}) => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), ...patch },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("mapa", () => {
  it("a 5ª fase de cada mundo é marcada como chefe, com o nome dele", () => {
    open(<Campaign world="vila" />);
    const boss = screen.getByRole("link", { name: /Fase 5, chefe/ });
    expect(boss.closest("li")).toHaveClass("boss");
    expect(
      screen.getAllByRole("listitem").filter((li) => li.matches(".boss")),
    ).toHaveLength(1);
  });
  it("o portão diz quantas fases faltam e as estrelas do mundo", () => {
    const stars = { [levels[0].id]: 3, [levels[1].id]: 2 };
    open(<Campaign world="vila" />, { stars });
    expect(screen.getByText(/Faltam 3 fases · ★ 5\/15/)).toBeInTheDocument();
  });
});

describe("páginas secundárias", () => {
  it("Casual mostra a barra de progresso de cada tema", () => {
    open(<Casual />);
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBeGreaterThanOrEqual(4);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "0");
  });
  it("Diário diferencia concluído, hoje e dias futuros, e conta a sequência", () => {
    const [y, m, d] = today().split("-").map(Number);
    const iso = (n: number) =>
      `${y}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    const daily = d >= 3 ? [iso(d - 2), iso(d - 1), iso(d)] : [iso(d)];
    open(<Daily />, { daily });
    expect(
      screen.getByLabelText(new RegExp(`Dia ${d}: concluído`)),
    ).toHaveClass("today", "done");
    if (d < 28)
      expect(
        screen.getByLabelText(`Dia ${d + 1}: ainda indisponível`),
      ).toHaveClass("future");
    if (d >= 3) expect(screen.getByText(/3 dias seguidos/)).toBeInTheDocument();
  });
  it("Perfil traz as conquistas: fases, estrelas e duelos", () => {
    open(<Profile />, {
      stars: { [levels[0].id]: 3 },
      duels: { a: "win", b: "win", c: "loss", d: "draw" },
      daily: ["2026-01-01"],
    });
    const box = screen.getByLabelText("Suas conquistas");
    expect(box).toHaveTextContent("Fases1/25");
    expect(box).toHaveTextContent("Estrelas3/75");
    expect(box).toHaveTextContent("Vitórias2");
    expect(box).toHaveTextContent("Empates1");
    expect(box).toHaveTextContent("Derrotas1");
    expect(box).toHaveTextContent("Desafios do dia1");
  });
});

describe("janela de vitória", () => {
  const base = {
    result: "win" as const,
    rival: OPPONENTS[0],
    mood: "happy" as const,
    moodKey: 1,
    scores: { p: 12, ai: 5 },
    coins: 50,
    stars: 2,
    enabled: false,
    onClose: () => {},
  };
  it("mostra o progresso do mundo, o próximo rival e o mundo desbloqueado", () => {
    render(
      <MemoryRouter>
        <ResultPopup
          {...base}
          nextTo="/play/vila-2"
          nextRival="Sabi"
          progress={{ world: "Vila das Palavras", done: 5, total: 5, stars: 9 }}
          unlocked="Floresta dos Enigmas"
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Vila das Palavras · 5\/5 fases/),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "5",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Floresta dos Enigmas",
    );
    expect(screen.getByText("Próximo rival: Sabi")).toBeInTheDocument();
  });
  it("sem os dados novos, a janela continua igual", () => {
    render(
      <MemoryRouter>
        <ResultPopup {...base} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/Próximo rival/)).toBeNull();
  });
});
