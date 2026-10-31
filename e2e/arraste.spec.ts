import { expect, test, type Page } from "@playwright/test";
import { dismissTour } from "./tour";

const open = async (page: Page) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await dismissTour(page);
};
const tile = (page: Page) =>
  page.getByRole("button", { name: /^Inserir letra/ }).first();
const centre = (b: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});
const ghost = (page: Page) => page.locator(".drag-letter-ghost");

test("a letra levantada deixa o lugar vazio e volta voando quando a soltura é recusada", async ({
  page,
}) => {
  await open(page);
  const t = tile(page);
  const home = centre((await t.boundingBox())!);
  const label = await t.textContent();
  // Levanta a letra e a leva para o topo da tela (fora da grade).
  await page.mouse.move(home.x, home.y);
  await page.mouse.down();
  await page.mouse.move(180, 120, { steps: 10 });
  await expect(ghost(page)).toHaveCount(1);
  // O lugar dela no banco fica vazio: nada de cópia parada no lugar.
  await expect(t).toHaveClass(/drag-source/);
  expect(await t.evaluate((el) => getComputedStyle(el).color)).toBe(
    "rgba(0, 0, 0, 0)",
  );
  await page.mouse.up();
  // Voo de volta: o fantasma se aproxima do lugar de origem até chegar.
  const dist = async () => {
    // Sem esperar: se o fantasma já chegou e saiu, não há mais o que medir.
    const b = await ghost(page)
      .boundingBox({ timeout: 100 })
      .catch(() => null);
    if (!b) return null;
    const c = centre(b);
    return Math.hypot(c.x - home.x, c.y - home.y);
  };
  const first = (await dist())!;
  expect(first).toBeGreaterThan(200);
  const samples: number[] = [first];
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(25);
    const d = await dist();
    if (d === null) break;
    samples.push(d);
  }
  expect(Math.min(...samples)).toBeLessThan(first * 0.5);
  await expect(ghost(page)).toHaveCount(0);
  await expect(t).not.toHaveClass(/drag-source/);
  await expect(t).toHaveText(label!);
  expect(await t.evaluate((el) => getComputedStyle(el).color)).not.toBe(
    "rgba(0, 0, 0, 0)",
  );
});

test("soltar numa casa aceita coloca a letra e não há voo de volta", async ({
  page,
}) => {
  await open(page);
  const t = tile(page);
  const letter = (await t.textContent())!;
  const home = centre((await t.boundingBox())!);
  const target = page.locator('.cell.letter[aria-label$="vazia"]').first();
  const cell = (await target.boundingBox())!;
  await page.mouse.move(home.x, home.y);
  await page.mouse.down();
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(ghost(page)).toHaveCount(0);
  await expect(page.locator(".cell.pending")).toHaveCount(1);
  await expect(page.locator(".cell.pending")).toContainText(letter);
});
