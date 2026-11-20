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
  expect(screen.getByText("Sua aventura começa!")).toBeVisible();
  // A Loja saiu da home (fica no "+" das moedas, no topo).
  expect(screen.queryByRole("link", { name: /Loja de itens/ })).toBeNull();
});
it("o card 'Desafie seu amigo' leva ao duelo ao vivo, com o avatar do jogador contra o de um amigo", async () => {
  const { memoryBackend, setOnlineBackend } =
    await import("../services/online");
  const { friendAvatarFor } = await import("../features/DuelCard");
  setOnlineBackend(memoryBackend().as("eu"));
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), avatar: "latina" },
    ready: true,
  });
  const { container } = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: /Desafie seu amigo/ }),
  ).toHaveAttribute("href", "/online");
  const faces = [...container.querySelectorAll(".duel-face")].map((i) =>
    i.getAttribute("src"),
  );
  // O amigo nunca tem o mesmo rosto do jogador.
  expect(faces).toEqual([
    "/art/opponents/latina-happy.webp",
    "/art/opponents/garoto-happy.webp",
  ]);
  expect(friendAvatarFor("jogador")).toBe("latina");
  setOnlineBackend(undefined);
});

it("a trilha mostra as fases do mundo atual: vencidas, a de agora e as que faltam, com o total da Aventura", async () => {
  const { worldProgress } = await import("../features/WorldCard");
  const stars = Object.fromEntries(levels.slice(0, 3).map((l) => [l.id, 2]));
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), stars },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  const steps = screen.getAllByRole("listitem", { name: /^Fase \d/ });
  expect(steps.map((s) => s.className.split(" ")[1])).toEqual([
    "done",
    "done",
    "done",
    "current",
    "pending",
  ]);
  expect(steps[3]).toHaveAttribute("aria-current", "step");
  expect(screen.getByText("Fase 4 de 5")).toBeInTheDocument();
  expect(screen.getByText("Aventura: 3/25 fases")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Baú fechado/ })).toBeVisible();
  expect(
    screen.getByRole("link", { name: /Continuar aventura/ }),
  ).toHaveAttribute("href", `/play/${levels[3].id}`);
  // Ao vencer o mundo, a trilha passa para o próximo.
  const five = Object.fromEntries(levels.slice(0, 5).map((l) => [l.id, 1]));
  const w2 = worldProgress(five);
  expect(w2.number).toBe(2);
  expect(w2.world.id).toBe(levels[5].world);
  expect(w2.steps.map((s) => s.state)).toEqual([
    "current",
    "pending",
    "pending",
    "pending",
    "pending",
  ]);
  // Quinta fase de um mundo.
  const nine = Object.fromEntries(levels.slice(0, 9).map((l) => [l.id, 1]));
  expect(worldProgress(nine).steps.at(-1)?.state).toBe("current");
});
it("com a Aventura toda vencida não aparece fase inexistente: o último mundo completo e o botão do mapa", () => {
  const stars = Object.fromEntries(levels.map((l) => [l.id, 3]));
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), stars },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
  expect(screen.getByText("Aventura completa!")).toBeInTheDocument();
  expect(screen.getByText("Aventura: 25/25 fases")).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("listitem", { name: /^Fase \d/ })
      .every((s) => s.classList.contains("done")),
  ).toBe(true);
  expect(screen.getByRole("link", { name: /Rever o mapa/ })).toHaveAttribute(
    "href",
    "/map",
  );
  expect(screen.queryByText(/Fase \d de/)).toBeNull();
});
it("cada mundo da Aventura tem a própria cena no card (e o arquivo existe)", async () => {
  const { worldArt } = await import("../features/WorldCard");
  const { maps } = await import("../data/catalog");
  const { existsSync } = await import("node:fs");
  const scenes = maps.map((m) => worldArt(m).src);
  expect(new Set(scenes).size).toBe(maps.length);
  // O card não repete o fundo da tela inicial.
  expect(scenes).not.toContain("/art/village-approved-v1.webp");
  for (const src of scenes) expect(existsSync(`public${src}`)).toBe(true);
  // Um mundo novo vindo do conteúdo, sem cena própria, usa a arte do mapa.
  expect(worldArt({ id: "novo", art: "/x.jpg" }).src).toBe("/x.jpg");
});
