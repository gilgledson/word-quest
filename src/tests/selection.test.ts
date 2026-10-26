import fs from "node:fs";
import { describe, it, expect } from "vitest";

const css = fs.readFileSync("src/app/styles.css", "utf8");

describe("Seleção de texto", () => {
  it("o aplicativo inteiro desliga a seleção e o menu de toque longo", () => {
    const rule = /html,\s*body\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/user-select:\s*none/);
    expect(rule).toMatch(/-webkit-user-select:\s*none/);
    expect(rule).toMatch(/-webkit-touch-callout:\s*none/);
  });
  it("campos de digitação continuam selecionáveis", () => {
    const rule =
      /input,\s*textarea,\s*\[contenteditable="true"\]\s*\{([^}]*)\}/.exec(
        css,
      )?.[1] ?? "";
    expect(rule).toMatch(/user-select:\s*text/);
  });
  it("nenhuma regra reativa a seleção fora dos campos de digitação", () => {
    const enabled = [
      ...css.matchAll(/([^{}]+)\{[^{}]*user-select:\s*(text|auto|all)[^}]*\}/g),
    ];
    for (const [, selector] of enabled)
      expect(selector).toMatch(/input|textarea|contenteditable/);
  });
});
