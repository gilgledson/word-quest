import { describe, expect, it } from "vitest";
import { confirmMessage } from "../features/puzzle/messages";

describe("Mensagem depois de confirmar a jogada", () => {
  it.each([
    [
      { won: 0, penalty: 1, returned: 1 },
      "Nenhuma letra certa · −1 ponto · 1 letra voltou ao banco",
    ],
    [
      { won: 0, penalty: 2, returned: 2 },
      "Nenhuma letra certa · −2 pontos · 2 letras voltaram ao banco",
    ],
    [{ won: 3, penalty: 0, returned: 0 }, "+3 pontos"],
    [{ won: 1, penalty: 0, returned: 0 }, "+1 ponto"],
    [
      { won: 4, penalty: 1, returned: 1 },
      "+4 pontos · −1 ponto · 1 letra voltou ao banco",
    ],
    [
      { won: 2, penalty: 0, returned: 3 },
      "+2 pontos · 3 letras voltaram ao banco",
    ],
    [{ won: 0, penalty: 0, returned: 0 }, "Nenhuma letra certa"],
  ])("%j → %s", (input, text) => {
    expect(confirmMessage(input)).toBe(text);
  });
  it("concorda o verbo com o número e nunca mistura singular e plural", () => {
    for (let n = 1; n <= 5; n++) {
      const text = confirmMessage({ won: 0, penalty: n, returned: n });
      expect(text).toMatch(
        n === 1 ? /1 letra voltou/ : new RegExp(`${n} letras voltaram`),
      );
      expect(text).toMatch(
        n === 1 ? /−1 ponto(?!s)/ : new RegExp(`−${n} pontos`),
      );
    }
  });
});
