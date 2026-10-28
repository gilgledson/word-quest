import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, it, expect } from "vitest";
import { Home, Profile } from "../features/pages";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
afterEach(cleanup);
it("oferece continuar a primeira fase e acessar o diário", () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: /Continuar aventura/ }),
  ).toHaveAttribute("href", "/play/vila-1");
  expect(screen.getByRole("link", { name: /Desafio do Dia/ })).toHaveAttribute(
    "href",
    "/daily",
  );
});
it("a fase não tem escolha de oponente: o link da campanha é só o da fase", () => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), botLevel: "dificil" },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: /Continuar aventura/ }),
  ).toHaveAttribute("href", "/play/vila-1");
  expect(screen.queryByRole("link", { name: /Duelo/ })).toBeNull();
});
it("o perfil mostra os rivais (sem seletor): cada fase tem o seu e o último de cada mundo é o chefe", () => {
  usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  const list = screen.getByRole("list", { name: "Rivais" });
  expect(list.querySelectorAll("li")).toHaveLength(11);
  expect(list).toHaveTextContent("Bolota");
  expect(list).toHaveTextContent("Chefe · Médio · Cuidadoso");
  expect(list).toHaveTextContent("Capitão Polvo");
});
