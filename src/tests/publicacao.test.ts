import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { validateContent, type GameContent } from "../content/validate";
import { finishesForFree } from "./solve";

/**
 * Conferência da publicação (scripts/publish-content.mjs passa CONTENT_FILE). Fora dela, não roda.
 * Além da validação que o aparelho faz, joga cada grade até o fim só com ações gratuitas.
 */
const file = process.env.CONTENT_FILE;
// Na suíte normal o arquivo não existe: o bloco é coletado como pulado (não é lido).
const content: GameContent | undefined = file
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : undefined;
describe.skipIf(!content)("Conteúdo a publicar", () => {
  if (!content) {
    it("só roda na publicação", () => {});
    return;
  }
  it("passa na validação do app", () => {
    expect(validateContent(content)).toEqual([]);
  });
  const { levels, variants, casual } = content.catalog;
  const grids = [
    ...levels,
    ...levels.flatMap((l) =>
      (variants[l.id] ?? []).map((words, k) => ({
        ...l,
        id: `${l.id}#${k + 1}`,
        words,
      })),
    ),
    ...casual.flatMap((t) => t.puzzles),
  ];
  it.each(grids)("$id chega ao fim só com ações gratuitas", (p) => {
    expect(finishesForFree(p)).toBe(true);
  });
});
