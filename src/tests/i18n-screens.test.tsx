import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../components/Layout";
import { Home, Profile } from "../features/pages";
import { changeLang, setLang } from "../i18n";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

// Trocar de idioma recarrega o app: no teste só conferimos o pedido.
vi.mock("../i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../i18n")>()),
  changeLang: vi.fn(),
}));

afterEach(() => {
  cleanup();
  setLang("pt");
  vi.mocked(changeLang).mockClear();
});

const fresh = () =>
  usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });

describe("Idioma nas telas", () => {
  it("os Ajustes do perfil trocam o idioma (cada opção no próprio idioma)", () => {
    fresh();
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Ajustes" }));
    const group = screen.getByRole("group", { name: "Idioma / Language" });
    expect(group).toBeInTheDocument();
    const pt = screen.getByRole("button", { name: "Português" });
    const en = screen.getByRole("button", { name: "English" });
    expect(pt).toHaveAttribute("aria-pressed", "true");
    expect(en).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(en);
    expect(changeLang).toHaveBeenCalledWith("en");
  });

  it("em inglês, a tela inicial e o menu de baixo aparecem traduzidos", () => {
    setLang("en");
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
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toHaveTextContent("Adventure");
    expect(nav).toHaveTextContent("Daily");
    expect(nav).toHaveTextContent("Profile");
    expect(
      screen.getByRole("link", { name: /Play first level/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "WordQuest — The Word Journey" }),
    ).toBeInTheDocument();
  });

  it("em inglês, o perfil marca English como o idioma atual", () => {
    setLang("en");
    fresh();
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Português" }));
    expect(changeLang).toHaveBeenCalledWith("pt");
  });
});
