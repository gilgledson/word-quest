import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
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

test("tocar no curinga só põe a estrela; a letra aparece ao confirmar", async ({
  page,
}) => {
  await withJoker(page);
  const before = await page.locator(".cell.correct").count();
  await joker(page).click();
  const cell = page.locator(".cell.joker-cell");
  await expect(cell).toHaveCount(1);
  await expect(cell).toHaveClass(/pending/);
  await expect(cell).toHaveText("★");
  await expect(page.locator(".cell.correct")).toHaveCount(before);
  await expect(joker(page)).toHaveCount(0);
  await page.getByRole("button", { name: /^Confirmar/ }).click();
  await expect(cell).toHaveClass(/correct/);
  await expect(cell).not.toHaveText("★");
  await expect(cell).not.toHaveText("?");
});

test("arrastar o curinga para uma casa e depois para outra, sem revelar a letra", async ({
  page,
}) => {
  await withJoker(page);
  const drag = async (from: Locator, to: Locator) => {
    const a = (await from.boundingBox())!;
    const b = (await to.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  };
  const first = page.locator('.cell.letter[aria-label$="vazia"]').nth(20);
  const firstKey = await first.getAttribute("data-cell");
  await drag(joker(page), first);
  const placed = page.locator(`[data-cell="${firstKey}"]`);
  await expect(placed).toHaveClass(/joker-cell/);
  await expect(placed).toHaveClass(/pending/);
  await expect(placed).toHaveText("★");
  await expect(joker(page)).toHaveCount(0);
  const second = page.locator('.cell.letter[aria-label$="vazia"]').nth(30);
  const secondKey = await second.getAttribute("data-cell");
  await drag(placed, second);
  const moved = page.locator(`[data-cell="${secondKey}"]`);
  await expect(moved).toHaveClass(/joker-cell/);
  await expect(moved).toHaveText("★");
  await expect(page.locator(`[data-cell="${firstKey}"]`)).not.toHaveClass(
    /joker-cell/,
  );
});
