import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Credits } from "../features/Credits";
import { Profile } from "../features/pages";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Bomb = ({ explode }: { explode: boolean }) => {
  if (explode) throw new Error("falha de teste");
  return <p>tela ok</p>;
};

describe("ErrorBoundary", () => {
  it("troca a tela quebrada por uma mensagem com saída, sem tela em branco", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Ops, algo deu errado");
    expect(screen.getByRole("alert")).toHaveTextContent("progresso está salvo");
    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voltar ao início" }),
    ).toBeInTheDocument();
  });
  it("Tentar de novo volta a mostrar a tela quando o erro passou", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let explode = true;
    const Flaky = () => <Bomb explode={explode} />;
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    explode = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(screen.getByText("tela ok")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("o erro some sozinho quando a chave de navegação muda", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Harness = () => {
      const [path, setPath] = useState("/a");
      return (
        <>
          <button onClick={() => setPath("/b")}>ir</button>
          <ErrorBoundary resetKey={path}>
            <Bomb explode={path === "/a"} />
          </ErrorBoundary>
        </>
      );
    };
    render(<Harness />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ir" }));
    expect(screen.getByText("tela ok")).toBeInTheDocument();
  });
});

describe("Créditos", () => {
  it("lista o vocabulário VERO com a licença, a música, a arte, a fonte e o software livre", () => {
    render(
      <MemoryRouter>
        <Credits />
      </MemoryRouter>,
    );
    const box = screen.getByLabelText("Créditos");
    expect(box).toHaveTextContent("VERO");
    expect(box).toHaveTextContent("LGPLv3");
    expect(box).toHaveTextContent("Raimundo Santos Moura");
    expect(box).toHaveTextContent("Where the River Bends");
    expect(box).toHaveTextContent("inteligência artificial");
    expect(box).toHaveTextContent("SIL Open Font License");
    expect(box).toHaveTextContent("MIT");
    expect(box).toHaveTextContent("Apache 2.0");
    expect(
      screen.getByRole("link", { name: /Voltar ao perfil/ }),
    ).toHaveAttribute("href", "/profile");
  });
  it("o Perfil tem o atalho para os créditos", () => {
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Créditos e licenças" }),
    ).toHaveAttribute("href", "/credits");
  });
});
