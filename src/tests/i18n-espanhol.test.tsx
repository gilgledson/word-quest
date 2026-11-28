import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../components/Layout";
import { Home, Profile } from "../features/pages";
import {
  changeLang,
  choosableLangs,
  deviceLang,
  locale,
  logoSrc,
  num,
  setLang,
  SPANISH_READY,
  tr,
} from "../i18n";
import { ACHIEVEMENTS } from "../game/achievements";
import { SHOP_ITEMS } from "../game/shop";
import { PLAYER_AVATARS } from "../game/avatars";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
import { messageFor } from "../../functions/lib.js";
import { normalize } from "../game/engine/grid";
// @ts-expect-error script em JS sem tipos
import { strip } from "../../scripts/lib/lang.mjs";

vi.mock("../i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../i18n")>()),
  changeLang: vi.fn(),
}));

afterEach(() => {
  cleanup();
  setLang("pt");
  vi.unstubAllGlobals();
  vi.mocked(changeLang).mockClear();
});

const fresh = () =>
  usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });

describe("Espanhol", () => {
  it("aparelho em espanhol abre em espanhol; Español aparece nos Ajustes", () => {
    expect(SPANISH_READY).toBe(true);
    vi.stubGlobal("navigator", { languages: ["es-MX"], language: "es-MX" });
    expect(deviceLang()).toBe("es");
    vi.stubGlobal("navigator", { languages: ["es-419"], language: "es-419" });
    expect(deviceLang()).toBe("es");
    vi.stubGlobal("navigator", { languages: ["fr-FR"], language: "fr-FR" });
    expect(deviceLang()).toBe("en");
    expect(choosableLangs()).toEqual(["pt", "en", "es"]);
  });

  it("quem já está em espanhol vê a opção Español marcada", () => {
    setLang("es");
    expect(choosableLangs()).toEqual(["pt", "en", "es"]);
    fresh();
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Ajustes" }));
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(changeLang).toHaveBeenCalledWith("en");
  });

  it("locale, números, título e logo", () => {
    setLang("es");
    expect(locale()).toBe("es-419");
    expect(document.documentElement.lang).toBe("es-419");
    expect(document.title).toBe("WordQuest — La Jornada de las Palabras");
    expect(num(1234)).toBe((1234).toLocaleString("es-419"));
    expect(tr("a", "b", "c")).toBe("c");
    expect(logoSrc()).toMatch(/^\/art\/wordquest-logo/);
  });

  it("a tela inicial e o menu de baixo em espanhol", () => {
    setLang("es");
    fresh();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveTextContent("Aventura");
    expect(nav).toHaveTextContent("Perfil");
  });

  it("loja, avatares e conquistas trocam para o espanhol", () => {
    setLang("es");
    expect(SHOP_ITEMS.find((i) => i.id === "curinga")!.nome).toBe("Comodín");
    expect(PLAYER_AVATARS[0].name).toBe("Explorador");
    const first = ACHIEVEMENTS.find((a) => a.id === "primeiro-passo")!;
    expect(first.title).not.toBe("O primeiro passo");
    expect(first.title).not.toBe("The first step");
  });

  it("os avisos do duelo saem em espanhol", () => {
    const turn = messageFor(
      { uid: "a", code: "C", kind: "turn", rival: "Sofía" },
      "es",
    );
    expect(turn.title).toBe("¡Tu turno en WordQuest!");
    expect(turn.body).toContain("Sofía");
    expect(
      messageFor(
        {
          uid: "a",
          code: "C",
          kind: "finished",
          rival: "Mateo",
          result: "win",
        },
        "es",
      ).title,
    ).toBe("¡Ganaste!");
    // Idioma desconhecido continua no português.
    expect(
      messageFor({ uid: "a", code: "C", kind: "turn", rival: "X" }, "fr").title,
    ).toBe("Sua vez no WordQuest!");
  });
});

describe("Ñ: letra própria no espanhol", () => {
  it("o app tira os acentos, mas mantém o Ñ", () => {
    expect(normalize("ñandú")).toBe("ÑANDU");
    expect(normalize("Mañana")).toBe("MAÑANA");
    expect(normalize("canción")).toBe("CANCION");
    expect(normalize("pingüino")).toBe("PINGUINO");
    // Português segue igual: o til do Ã e do Õ sai.
    expect(normalize("São João")).toBe("SAO JOAO");
    expect(normalize("coração")).toBe("CORACAO");
  });
  it("os scripts de conteúdo fazem o mesmo", () => {
    expect(strip("niño").toUpperCase()).toBe("NIÑO");
    expect(strip("mãe")).toBe("mae");
  });
});
