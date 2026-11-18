import { describe, expect, it } from "vitest";
import { routeOfLink, routeOfReferrer } from "../services/links";
import { inviteLink, newCode } from "../game/online";

describe("links do site", () => {
  it("o link do convite leva à sala do código", () => {
    const code = newCode();
    expect(routeOfLink(inviteLink(code))).toBe(`/online/${code}`);
    expect(routeOfLink(`https://www.wordquest.com.br/c/${code}?x=1`)).toBe(
      `/online/${code}`,
    );
    // Minúsculas e traços, como alguém pode digitar ou o WhatsApp pode quebrar.
    expect(routeOfLink("https://wordquest.com.br/c/abc-123")).toBe(
      "/online/ABC123",
    );
  });
  it("código inválido abre o lobby; outro caminho do site abre o início", () => {
    expect(routeOfLink("https://wordquest.com.br/c/XYZ")).toBe("/online");
    expect(routeOfLink("https://wordquest.com.br/")).toBe("/");
  });
  it("links de outros sites e lixo são ignorados", () => {
    expect(routeOfLink("https://example.com/c/ABC123")).toBeUndefined();
    expect(
      routeOfLink("https://wordquest.com.br.evil.com/c/ABC123"),
    ).toBeUndefined();
    expect(routeOfLink("não é url")).toBeUndefined();
  });
  it("o referrer da Play Store traz a sala do convite", () => {
    expect(routeOfReferrer("sala=ABC123&utm_source=convite")).toBe(
      "/online/ABC123",
    );
    expect(
      routeOfReferrer("utm_source=google-play&utm_medium=organic"),
    ).toBeUndefined();
    expect(routeOfReferrer(undefined)).toBeUndefined();
    expect(routeOfReferrer("sala=AB")).toBeUndefined();
  });
});
