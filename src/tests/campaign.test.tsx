import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, it, expect } from "vitest";
import { Campaign, roadX } from "../features/pages";
import fs from "node:fs";
import { levels, maps, worldLevels } from "../data/catalog";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);
const open = (stars: Record<string, number> = {}, world?: string) => {
  usePlayer.setState({
    player: { ...structuredClone(initialPlayer), stars },
    ready: true,
  });
  render(
    <MemoryRouter>
      <Campaign world={world} />
    </MemoryRouter>,
  );
};
const top = (n: number) =>
  parseFloat(
    screen.getByRole("link", { name: new RegExp(`^Fase ${n},`) }).closest("li")!
      .style.top,
  );

describe("Mapa de fases", () => {
  it("as fases sobem de baixo para cima: a 1 fica embaixo e a última no alto", () => {
    open();
    expect(top(1)).toBeGreaterThan(top(2));
    expect(top(2)).toBeGreaterThan(top(3));
    // O portão do próximo mundo fica acima da última fase, sem sobrepor.
    expect(top(3)).toBeGreaterThan(160);
    expect(top(1)).toBeLessThan(640);
  });
  it("as fases ficam sobre o caminho da ilustração 3D", () => {
    open();
    worldLevels("vila").forEach((l) => {
      const left = parseFloat(
        screen
          .getByRole("link", { name: new RegExp(`^Fase ${l.number},`) })
          .closest("li")!.style.left,
      );
      expect(left).toBeGreaterThan(360 * 0.2);
      expect(left).toBeLessThan(360 * 0.8);
    });
  });
  it("o caminho continua sem saltos nas emendas dos ladrilhos espelhados", () => {
    const h = 500;
    for (const seam of [h, 2 * h, 3 * h])
      expect(
        Math.abs(roadX(seam - 0.5, h) - roadX(seam + 0.5, h)),
      ).toBeLessThan(0.5);
  });
  it("é uma tela só: ilustração cobrindo tudo, sem barra de navegação, portão no alto e início embaixo", () => {
    open();
    expect(screen.getByText("Início da jornada")).toBeInTheDocument();
    expect(screen.getByText("Floresta dos Enigmas")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText(/Ir para a fase atual/)).toBeNull();
    expect(document.querySelectorAll(".campaign-road path")).toHaveLength(1);
    expect(document.querySelectorAll(".campaign-art")).toHaveLength(1);
    expect(document.querySelector(".campaign-art")).toHaveAttribute(
      "src",
      "/art/map-straight-v1.jpg",
    );
  });
  it("estados: só a fase 1 liberada no começo; as outras bloqueadas", () => {
    open();
    expect(
      screen.getByRole("link", { name: /^Fase 1, disponível/ }),
    ).toHaveClass("current");
    expect(screen.getByText("Você está aqui")).toBeInTheDocument();
    const locked = screen.getByRole("link", { name: /^Fase 2, bloqueada/ });
    expect(locked).toHaveClass("locked");
    expect(locked).toHaveAttribute("aria-disabled", "true");
    expect(fireEvent.click(locked)).toBe(false); // navegação cancelada
  });
  it("vencer uma fase mostra as estrelas e libera a próxima", () => {
    open({ [levels[0].id]: 2 });
    expect(
      screen.getByRole("link", { name: /^Fase 1, 2 estrelas/ }),
    ).toHaveClass("complete");
    expect(screen.getByText("★★")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^Fase 2, disponível/ }),
    ).toHaveClass("current");
    expect(
      screen.getByRole("link", { name: /^Fase 3, bloqueada/ }),
    ).toHaveClass("locked");
  });
  it("com todas vencidas, a atual é a última e o trecho dourado chega até ela", () => {
    open(Object.fromEntries(worldLevels("vila").map((l) => [l.id, 3])));
    expect(screen.queryByText(/Ir para a fase atual/)).toBeNull();
    const d = document.querySelector(".progress-road")!.getAttribute("d")!;
    const lastY = parseFloat(d.trim().split(" ").at(-1)!);
    const lastNode = screen
      .getByRole("link", { name: /^Fase 5,/ })
      .closest("li")!;
    expect(lastY).toBeLessThanOrEqual(parseFloat(lastNode.style.top));
  });
  it("a Vila tem 5 fases e o portão da Floresta só abre depois de vencê-las", () => {
    open();
    expect(worldLevels("vila")).toHaveLength(5);
    expect(
      screen.queryByRole("link", { name: /Floresta dos Enigmas/ }),
    ).toBeNull();
    cleanup();
    open(Object.fromEntries(worldLevels("vila").map((l) => [l.id, 2])));
    expect(
      screen.getByRole("link", { name: /Floresta dos Enigmas/ }),
    ).toHaveAttribute("href", "/map/floresta");
  });
  it("a Floresta tem as fases 6 a 10, com a 6 liberada só após a Vila", () => {
    open({}, "floresta");
    expect(worldLevels("floresta").map((l) => l.number)).toEqual([
      6, 7, 8, 9, 10,
    ]);
    expect(document.querySelector(".campaign-art")).toHaveAttribute(
      "src",
      "/art/map-forest-v1.jpg",
    );
    expect(
      screen.getByRole("link", { name: /^Fase 6, bloqueada/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Vila das Palavras/ }),
    ).toHaveAttribute("href", "/map");
    cleanup();
    open({ "vila-5": 1 }, "floresta");
    expect(
      screen.getByRole("link", { name: /^Fase 6, disponível/ }),
    ).toHaveClass("current");
  });
  it("são 5 mundos de 5 fases, numeradas de 1 a 25, cada um com a própria arte", () => {
    expect(maps.map((m) => m.id)).toEqual([
      "vila",
      "floresta",
      "deserto",
      "reino",
      "ilhas",
    ]);
    expect(levels.map((l) => l.number)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
    for (const m of maps) {
      expect(worldLevels(m.id)).toHaveLength(5);
      expect(fs.existsSync(`public${m.art}`)).toBe(true);
    }
    expect(new Set(maps.map((m) => m.art)).size).toBe(5);
  });
  it("o último mundo avisa que vêm novos mundos e volta ao anterior", () => {
    open({}, "ilhas");
    expect(screen.getByText("Novos mundos")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Reino dos Sábios/ }),
    ).toHaveAttribute("href", "/map/reino");
  });
});
