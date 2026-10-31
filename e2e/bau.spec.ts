import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Grava um jogador com `words` palavras descobertas e `chestsOpened` baús abertos. */
const seed = async (page: Page, words: number, chestsOpened = 0) => {
  await page.goto("/");
  await page.evaluate(
    async ({ words, chestsOpened }) => {
      const wordsFound = {
        "vila-1": Array.from({ length: words }, (_, i) => `w${i}`),
      };
      await new Promise<void>((res, rej) => {
        const open = indexedDB.open("wordquest");
        open.onsuccess = () => {
          const tx = open.result.transaction("players", "readwrite");
          tx.objectStore("players").put({
            id: "local",
            data: {
              name: "Explorador",
              avatar: "jogador",
              coins: 100,
              stars: {},
              wordsFound,
              sessions: {},
              daily: [],
              duels: {},
              botLevel: "medio",
              opponent: "sabi",
              sound: true,
              soundChosen: false,
              music: false,
              vibration: true,
              animations: true,
              tutorialDone: true,
              chestsOpened,
            },
          });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        };
      });
    },
    { words, chestsOpened },
  );
  await page.goto("/");
};
const saldo = (page: Page) =>
  page.locator(".wallet span").filter({ has: page.locator("svg circle") });

test("com 25 palavras o baú da home abre e paga 50 moedas, uma vez só", async ({
  page,
}) => {
  await seed(page, 25);
  await expect(page.getByText("Baú pronto! Toque nele")).toBeVisible();
  await expect(saldo(page)).toContainText("100");
  // A animação em laço impede o clique "estável" do Playwright; o toque real funciona.
  await page.getByRole("button", { name: /Abrir baú/ }).click({ force: true });
  const dialog = page.getByRole("dialog", { name: "Baú aberto" });
  await expect(dialog).toContainText("+50 moedas");
  await expect(saldo(page)).toContainText("150");
  await dialog.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("button", { name: /Baú fechado/ }),
  ).toBeDisabled();
  await expect(page.getByText("Baú em 25 palavras")).toBeVisible();
  await page.reload();
  await expect(saldo(page)).toContainText("150"); // persistiu, sem pagar de novo
  await expect(
    page.getByRole("button", { name: /Baú fechado/ }),
  ).toBeDisabled();
});

test("abaixo de 25 palavras o baú segue fechado e a home diz quantas faltam", async ({
  page,
}) => {
  await seed(page, 20);
  await expect(
    page.getByRole("button", { name: /Baú fechado/ }),
  ).toBeDisabled();
  await expect(page.getByText("Baú em 5 palavras")).toBeVisible();
});

test("a home com baú pronto e com baú fechado não tem violações de acessibilidade", async ({
  page,
}) => {
  for (const words of [20, 25]) {
    await seed(page, words);
    await page.waitForTimeout(700);
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      r.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
      `${words} palavras`,
    ).toEqual([]);
  }
});
