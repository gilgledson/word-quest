import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { Layout } from "../components/Layout";
import { Campaign, Home, WorldMap } from "../features/pages";
import { levels, maps } from "../data/catalog";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);
const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
const where = () => screen.getByTestId("where").textContent;
function open(path: string, stars: Record<string, number>) {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), stars },
    ready: true,
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="map" element={<Campaign />} />
          <Route path="map/:world" element={<WorldMap />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
const all = Object.fromEntries(levels.map((l) => [l.id, 3]));

describe("Navegação entre os mundos", () => {
  it("com tudo vencido, vai da Vila às Ilhas pelos portões e volta pelos rótulos", () => {
    open("/map", all);
    for (const next of maps.slice(1)) {
      fireEvent.click(
        screen.getByRole("link", { name: new RegExp(next.nome) }),
      );
      expect(where()).toBe(next.path);
      expect(document.querySelector(".campaign-art")).toHaveAttribute(
        "src",
        next.art,
      );
    }
    for (const prev of [...maps].reverse().slice(1)) {
      fireEvent.click(
        screen.getByRole("link", { name: new RegExp(prev.nome) }),
      );
      expect(where()).toBe(prev.path);
      expect(document.querySelector(".campaign-art")).toHaveAttribute(
        "src",
        prev.art,
      );
    }
  });
  it("sem vencer o mundo, o portão não é um link, mas o caminho de volta sempre existe", () => {
    // Só a Vila inteira vencida: a Floresta abre; o Deserto continua trancado.
    const vila = Object.fromEntries(
      levels.filter((l) => l.world === "vila").map((l) => [l.id, 1]),
    );
    open("/map/floresta", vila);
    expect(
      screen.queryByRole("link", { name: /Deserto dos Mistérios/ }),
    ).toBeNull();
    expect(screen.getByText(/Faltam 5 fases/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /Vila das Palavras/ }));
    expect(where()).toBe("/map");
  });
  it("mundos fora da ordem também voltam: do último ao primeiro, passo a passo", () => {
    open("/map/ilhas", {});
    for (const prev of [...maps].reverse().slice(1)) {
      fireEvent.click(
        screen.getByRole("link", { name: new RegExp(prev.nome) }),
      );
      expect(where()).toBe(prev.path);
    }
  });
  it("cada mapa tem o botão de voltar ao menu principal", () => {
    for (const m of maps) {
      open(m.path, {});
      fireEvent.click(
        screen.getByRole("link", { name: "Voltar ao menu principal" }),
      );
      expect(where()).toBe("/");
      expect(
        screen.queryByRole("link", { name: "Voltar ao menu principal" }),
      ).toBeNull();
      cleanup();
    }
  });
  it("um mundo que não existe cai na Vila", () => {
    open("/map/inexistente", {});
    expect(document.querySelector(".campaign-art")).toHaveAttribute(
      "src",
      maps[0].art,
    );
  });
});
