import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Grava um jogador com `wins` fases da Vila concluídas e `chestsOpened` baús abertos. */
const seed = async (page: Page, wins: number, chestsOpened = 0) => {
  await page.goto("/");
  await page.evaluate(
    async ({ wins, chestsOpened }) => {
      const stars = Object.fromEntries(
        Array.from({ length: wins }, (_, i) => [`vila-${i + 1}`, 2]),
      );
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
              stars,
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
    { wins, chestsOpened },
  );
  await page.goto("/");
};
const saldo = (page: Page) =>
  page.locator(".wallet span").filter({ has: page.locator("svg circle") });

test("com 5 vitórias o baú da home abre e paga 50 moedas, uma vez só", async ({
  page,
}) => {
  await seed(page, 5);
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
  await expect(page.getByText("Baú em 5 vitórias")).toBeVisible();
  await page.reload();
  await expect(saldo(page)).toContainText("150"); // persistiu, sem pagar de novo
  await expect(
    page.getByRole("button", { name: /Baú fechado/ }),
  ).toBeDisabled();
});

test("abaixo de 5 vitórias o baú segue fechado e a home diz quantas faltam", async ({
  page,
}) => {
  await seed(page, 3);
  await expect(
    page.getByRole("button", { name: /Baú fechado/ }),
  ).toBeDisabled();
  await expect(page.getByText("Baú em 2 vitórias")).toBeVisible();
});

test("a home com baú pronto e com baú fechado não tem violações de acessibilidade", async ({
  page,
}) => {
  for (const wins of [3, 5]) {
    await seed(page, wins);
    await page.waitForTimeout(700);
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      r.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
      `${wins} vitórias`,
    ).toEqual([]);
  }
});
