import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Violações WCAG 2 A/AA da página atual (contraste, nomes, ARIA...). */
const violacoes = async (page: Page) => {
  await page.waitForTimeout(600); // deixa as transições de entrada terminarem
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return r.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
};

for (const path of [
  "/",
  "/map",
  "/map/floresta",
  "/casual",
  "/daily",
  "/profile",
])
  test(`sem violações de acessibilidade em ${path}`, async ({ page }) => {
    await page.goto(path);
    expect(await violacoes(page)).toEqual([]);
  });

test("sem violações na partida, com peça pendente e no diálogo de troca", async ({
  page,
}) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  expect(await violacoes(page)).toEqual([]);
  await page
    .getByRole("group", { name: "Letras do banco" })
    .getByRole("button")
    .first()
    .click();
  expect(await violacoes(page)).toEqual([]);
  await page.getByRole("button", { name: "Trocar", exact: true }).click();
  await page
    .getByRole("button", { name: /Trocar letra/ })
    .first()
    .click();
  expect(await violacoes(page)).toEqual([]);
});

test("diário com dias concluídos e conquista obtida continuam acessíveis", async ({
  page,
}) => {
  await page.goto("/");
  const hoje = new Date();
  const iso = (n: number) =>
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  await page.evaluate(
    async ({ daily }) => {
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
              stars: { "vila-1": 3 },
              sessions: {},
              daily,
              duels: { a: "win" },
              botLevel: "medio",
              opponent: "sabi",
              sound: true,
              soundChosen: false,
              music: false,
              vibration: true,
              animations: true,
              tutorialDone: true,
            },
          });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        };
      });
    },
    { daily: [iso(hoje.getDate()), iso(Math.max(1, hoje.getDate() - 1))] },
  );
  for (const path of ["/daily", "/profile"]) {
    await page.goto(path);
    expect(await violacoes(page), path).toEqual([]);
  }
});
