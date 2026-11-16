import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, it, expect } from "vitest";
import { Home, Profile } from "../features/pages";
import { levels } from "../data/catalog";
import { PuzzleEngine } from "../game/crossword-engine";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
afterEach(cleanup);
it("oferece jogar a primeira fase e abrir o mapa pelo cartão da jornada", () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: /Jogar primeira fase/ }),
  ).toHaveAttribute("href", "/play/vila-1");
  expect(screen.getByRole("link", { name: /Ver o mapa/ })).toHaveAttribute(
    "href",
    "/map",
  );
  // Os cards soltos de Desafio do Dia e mapa saíram da home (o Diário fica no menu).
  expect(screen.queryByRole("link", { name: /Desafio do Dia/ })).toBeNull();
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
    screen.getByRole("link", { name: /Jogar primeira fase/ }),
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
  fireEvent.click(screen.getByRole("tab", { name: "Rivais" }));
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  const list = screen.getByRole("list", { name: "Rivais" });
  expect(list.querySelectorAll("li")).toHaveLength(11);
  expect(list).toHaveTextContent("Bolota");
  expect(list).toHaveTextContent("Chefe · Médio · Cuidadoso");
  expect(list).toHaveTextContent("Capitão Polvo");
});
it("o botão principal diz o que o toque faz: jogar, continuar ou retomar", () => {
  const open = (patch: Partial<typeof initialPlayer>) => {
    cleanup();
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), ...patch },
      ready: true,
    });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
  };
  // Quem já venceu a fase 1 continua na fase 2.
  open({ stars: { [levels[0].id]: 2 } });
  expect(
    screen.getByRole("link", { name: /Continuar aventura/ }),
  ).toHaveAttribute("href", `/play/${levels[1].id}`);
  // Partida da próxima fase com letras confirmadas: retomar.
  const fresh = new PuzzleEngine(levels[0]).start("k", "facil");
  const begun = { ...fresh, locked: ["1,1"] };
  open({ sessions: { [`vs:${levels[0].id}:facil`]: begun } });
  expect(screen.getByRole("link", { name: /Retomar partida/ })).toHaveAttribute(
    "href",
    `/play/${levels[0].id}`,
  );
  // Sessão aberta sem nenhuma letra confirmada não conta como partida começada.
  open({ sessions: { [`vs:${levels[0].id}:facil`]: fresh } });
  expect(
    screen.getByRole("link", { name: /Jogar primeira fase/ }),
  ).toBeInTheDocument();
  expect(screen.getByText("Resolva palavras. Vença seu rival.")).toBeVisible();
});
