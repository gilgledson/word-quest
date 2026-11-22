import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecaptchaNotice } from "../components/RecaptchaNotice";
import { OnlineLobby } from "../features/OnlinePage";
import { appCheckMode, currentMode } from "../services/appCheckMode";
import {
  memoryBackend,
  onlineErrorText,
  setOnlineBackend,
  UnverifiedError,
} from "../services/online";

const base = {
  native: false,
  plugin: false,
  host: "jogar.wordquest.com.br",
  siteKey: "chave",
  debugToken: "",
};

describe("App Check: qual verificação vale em cada lugar", () => {
  it("app Android com o plugin usa o nativo (Play Integrity)", () => {
    expect(appCheckMode({ ...base, native: true, plugin: true })).toBe(
      "native",
    );
  });
  it("app Android antigo, sem o plugin, segue sem App Check", () => {
    expect(appCheckMode({ ...base, native: true })).toBe("off");
  });
  it("versão web publicada usa o reCAPTCHA", () => {
    expect(appCheckMode(base)).toBe("recaptcha");
    expect(appCheckMode({ ...base, host: "wordquest-online.web.app" })).toBe(
      "recaptcha",
    );
  });
  it("sem chave do reCAPTCHA, a web segue sem App Check", () => {
    expect(appCheckMode({ ...base, siteKey: "" })).toBe("off");
  });
  it("localhost só liga com o token de depuração", () => {
    expect(appCheckMode({ ...base, host: "localhost" })).toBe("off");
    expect(
      appCheckMode({ ...base, host: "localhost", debugToken: "abc" }),
    ).toBe("debug");
  });
  it("outros endereços não usam a chave do site", () => {
    expect(appCheckMode({ ...base, host: "wordquest.com.br.golpe.io" })).toBe(
      "off",
    );
  });
  it("nos testes fica desligado (nada de SDK nem reCAPTCHA)", () => {
    expect(currentMode()).toBe("off");
  });
});

describe("App Check: o que o jogador vê", () => {
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
  });
  it("explica a recusa no app e na web", () => {
    expect(onlineErrorText(new UnverifiedError(true))).toMatch(/Play Store/);
    expect(onlineErrorText(new UnverifiedError(false))).toMatch(
      /verificar este navegador/,
    );
    expect(onlineErrorText(new Error("rede"))).toMatch(/Confira a internet/);
  });
  it("o selo do reCAPTCHA não aparece fora da versão web publicada", () => {
    const { container } = render(<RecaptchaNotice />);
    expect(container).toBeEmptyDOMElement();
  });
  it("a tela do duelo mostra o motivo quando o servidor recusa o aparelho", async () => {
    const backend = memoryBackend().as("eu");
    setOnlineBackend({
      ...backend,
      uid: () => Promise.reject(new UnverifiedError(true)),
    });
    render(
      <MemoryRouter initialEntries={["/online"]}>
        <Routes>
          <Route path="online" element={<OnlineLobby />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Entrar com código"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "ABC234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Entrar$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Atualize o WordQuest na Play Store/,
    );
  });
});

describe("App Check: conteúdo", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sem verificação, o download do conteúdo não leva cabeçalho nem baixa o Firebase", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => 0,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshContent } = await import("../content/content");
    const { initialPlayer } = await import("../services/repository");
    await refreshContent(structuredClone(initialPlayer));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/content\/version\.json$/),
      { cache: "no-store", headers: {} },
    );
  });
});
