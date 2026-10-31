import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { dismissTour } from "./tour";

const URL = "/play/vila-1?vs=medio";
/** Abre a fase 1, joga uma peça (grava a sessão) e põe o curinga no banco, pelo IndexedDB. */
async function withJoker(page: Page) {
  await page.goto(URL);
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await dismissTour(page);
  await page.getByRole("button", { name: "Pular" }).click();
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  await page.evaluate(
    () =>
      new Promise<void>((res, rej) => {
        const open = indexedDB.open("wordquest");
        open.onerror = () => rej(open.error);
        open.onsuccess = () => {
          const store = open.result
            .transaction("players", "readwrite")
            .objectStore("players");
          const get = store.get("local");
          get.onsuccess = () => {
            const row = get.result;
            const s = row.data.sessions["vs:vila-1:medio"];
            s.supply = s.supply.filter((id: string) => id !== "joker");
            s.rack = [...s.rack, "joker"];
            row.data.jokerTourDone = true;
            store.put(row).onsuccess = () => res();
          };
        };
      }),
  );
  await page.reload();
  await expect(page.locator(".board .cell")).toHaveCount(80);
}
const joker = (page: Page) =>
  page.getByRole("button", { name: "Inserir curinga" });

test("o curinga aparece no banco e passa na checagem de acessibilidade", async ({
  page,
}) => {
  await withJoker(page);
  await expect(joker(page)).toBeVisible();
  await expect(joker(page)).toHaveText("★");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("tocar no curinga trava a próxima casa da palavra com a letra certa", async ({
  page,
}) => {
  await withJoker(page);
  const before = await page.locator(".cell.correct").count();
  await joker(page).click();
  await expect(page.locator(".cell.correct")).toHaveCount(before + 1);
  await expect(page.locator(".cell.joker-cell")).toHaveCount(1);
  await expect(joker(page)).toHaveCount(0);
  await expect(page.getByText(/Curinga virou/)).toBeVisible();
  // A vez continua do jogador; ✓ encerra a jogada normalmente.
  await expect(page.getByText("vez do oponente ▶")).toHaveCount(0);
});

test("arrastar o curinga para qualquer casa do tabuleiro vira a letra dela", async ({
  page,
}) => {
  await withJoker(page);
  const target = page.locator('.cell.letter[aria-label$="vazia"]').nth(20);
  const label = await target.getAttribute("data-cell");
  const from = (await joker(page).boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  const cell = page.locator(`[data-cell="${label}"]`);
  await expect(cell).toHaveClass(/correct/);
  await expect(cell).toHaveClass(/joker-cell/);
  await expect(cell).not.toHaveText("?");
  await expect(joker(page)).toHaveCount(0);
});
