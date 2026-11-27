import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Shop } from "../features/Shop";
import { deviceCountry, isIndia } from "../game/region";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Região do jogador", () => {
  it("reconhece a Índia pelo fuso ou pela região do idioma", () => {
    expect(isIndia({ timeZone: "Asia/Kolkata", languages: ["en-US"] })).toBe(
      true,
    );
    expect(isIndia({ timeZone: "Asia/Calcutta" })).toBe(true);
    expect(isIndia({ timeZone: "UTC", languages: ["hi-IN"] })).toBe(true);
    expect(
      isIndia({ timeZone: "America/Sao_Paulo", languages: ["pt-BR"] }),
    ).toBe(false);
    expect(isIndia({ languages: ["en"] })).toBe(false);
  });
  it("país provável: fuso da Índia primeiro, senão a região do idioma", () => {
    expect(
      deviceCountry({ timeZone: "Asia/Kolkata", languages: ["en-US"] }),
    ).toBe("IN");
    expect(deviceCountry({ timeZone: "UTC", languages: ["en", "pt-BR"] })).toBe(
      "BR",
    );
    expect(
      deviceCountry({ timeZone: "UTC", languages: ["en"] }),
    ).toBeUndefined();
  });
});

describe("Ordem dos avatares na loja", () => {
  // Primeiro avatar da grade (a grade vai do mais barato ao mais caro).
  const firstAvatar = () =>
    screen
      .getByRole("list", { name: "Avatares premium" })
      .querySelector("strong")?.textContent;
  const open = () => {
    usePlayer.setState({
      player: structuredClone(initialPlayer),
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={["/loja?aba=avatares"]}>
        <Shop />
      </MemoryRouter>,
    );
  };
  it("na Índia, os avatares indianos vêm primeiro", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Asia/Kolkata",
    } as Intl.ResolvedDateTimeFormatOptions);
    open();
    expect(firstAvatar()).toBe("Jogador de Críquete");
  });
  it("fora da Índia, todos juntos por preço (Viking primeiro)", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "America/Sao_Paulo",
    } as Intl.ResolvedDateTimeFormatOptions);
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-BR"]);
    open();
    expect(firstAvatar()).toBe("Viking");
  });
});
