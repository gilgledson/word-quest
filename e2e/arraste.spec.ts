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
  // Registra cada mudança de posição do fantasma, para não depender de amostragem por tempo.
  const before = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".drag-letter-ghost")!;
    const log: { transform: string; transition: string }[] = [];
    (window as unknown as { __ghost: typeof log }).__ghost = log;
    new MutationObserver(() =>
      log.push({
        transform: el.style.transform,
        transition: el.style.transition,
      }),
    ).observe(el, { attributes: true, attributeFilter: ["style"] });
    return el.style.transform;
  });
  await page.mouse.up();
  // Voo de volta: o fantasma sai do ponto da soltura e termina centrado no lugar de origem.
  await expect(ghost(page)).toHaveCount(0);
  const log = await page.evaluate(
    () =>
      (
        window as unknown as {
          __ghost: { transform: string; transition: string }[];
        }
      ).__ghost,
  );
  const flight = log.at(-1)!;
  expect(flight.transition).toContain("240ms");
  // O fantasma ancora 12 px abaixo do centro da peça (GHOST_LIFT no hook); a peça levantada
  // pelo toque está uns 4 px acima do repouso, então a tolerância é de 6 px.
  const [fx, fy] = flight.transform
    .match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/)!
    .slice(1)
    .map(Number);
  expect(Math.abs(fx - home.x)).toBeLessThan(6);
  expect(Math.abs(fy - (home.y + 12))).toBeLessThan(6);
  expect(flight.transform).not.toBe(before);
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
