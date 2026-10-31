import { expect, test, type Page } from "@playwright/test";
import levels from "../src/data/levels.json" with { type: "json" };
import { dismissTour } from "./tour";

const positions = (w: (typeof levels)[0]["words"][0]) =>
  [...w.answer].map((letter, i) => ({
    letter: letter
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase(),
    key:
      w.direction === "horizontal"
        ? `${w.startRow},${w.startCol + i}`
        : `${w.startRow + i},${w.startCol}`,
  }));

const open = async (page: Page) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await dismissTour(page);
};
const tiles = (page: Page) =>
  page.getByRole("button", { name: /^Inserir letra/ });
/**
 * Posição horizontal de cada casa do banco (peça ou espaço vazio), da esquerda para a direita.
 * Usa a posição de layout (`offsetLeft`), que não muda durante a animação de entrada das peças.
 */
const slotsX = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".letter-bank [data-slot]")].map(
      (el) => ({
        slot: el.dataset.slot,
        empty: el.classList.contains("slot-empty"),
        x: el.offsetLeft,
      }),
    ),
  );

test("colocar uma peça deixa o lugar vazio e as outras não andam", async ({
  page,
}) => {
  await open(page);
  const before = await slotsX(page);
  expect(before.every((s) => !s.empty)).toBe(true);
  await tiles(page).nth(1).click();
  await expect(page.locator(".slot-empty")).toHaveCount(1);
  const after = await slotsX(page);
  // Mesmas casas, nas mesmas posições; só a de índice 1 virou vazia.
  expect(after.map((s) => s.x)).toEqual(before.map((s) => s.x));
  expect(after.map((s) => s.empty)).toEqual([false, true, false, false, false]);
});

test("arrastar uma peça para a grade também deixa o lugar vazio", async ({
  page,
}) => {
  await open(page);
  const before = await slotsX(page);
  const first = (await tiles(page).first().boundingBox())!;
  const target = (await page
    .locator('.cell.letter[aria-label$="vazia"]')
    .first()
    .boundingBox())!;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    {
      steps: 10,
    },
  );
  await page.mouse.up();
  await expect(page.locator(".cell.pending")).toHaveCount(1);
  const after = await slotsX(page);
  expect(after.map((s) => s.x)).toEqual(before.map((s) => s.x));
  expect(after[0].empty).toBe(true);
});

test("devolver a letra à mão: ela voa de volta e reaparece no mesmo lugar", async ({
  page,
}) => {
  await open(page);
  const before = await slotsX(page);
  await tiles(page).nth(2).click();
  const pending = page.locator(".cell.pending");
  await expect(pending).toHaveCount(1);
  // Espera o voo da ida terminar para observar só o de volta.
  await expect(page.locator(".tile-flight")).toHaveCount(0);
  // Registra se algum voo apareceu depois do toque que devolve a letra.
  await page.evaluate(() => {
    (window as unknown as { __flights: number }).__flights = 0;
    new MutationObserver((list) => {
      for (const m of list)
        m.addedNodes.forEach((n) => {
          if ((n as HTMLElement).classList?.contains("tile-flight"))
            (window as unknown as { __flights: number }).__flights++;
        });
    }).observe(document.body, { childList: true, subtree: true });
  });
  await pending.click();
  await expect(page.locator(".tile-flight")).toHaveCount(0);
  const flights = await page.evaluate(
    () => (window as unknown as { __flights: number }).__flights,
  );
  expect(flights).toBe(1);
  await expect(page.locator(".slot-empty")).toHaveCount(0);
  const after = await slotsX(page);
  expect(after.map((s) => s.x)).toEqual(before.map((s) => s.x));
  await expect(page.locator(".letter-bank .in-flight")).toHaveCount(0);
});

test("uma letra errada que volta ao banco faz o voo e reaparece no mesmo lugar", async ({
  page,
}) => {
  await open(page);
  const before = await slotsX(page);
  // Solução da fase 1: casa → letra.
  const solution: Record<string, string> = {};
  for (const w of levels[0].words)
    for (const c of positions(w)) solution[c.key] = c.letter;
  const t = tiles(page).first();
  const letter = (await t.textContent())!;
  const wrongKey = Object.keys(solution).find((k) => solution[k] !== letter)!;
  const from = (await t.boundingBox())!;
  const to = (await page.locator(`[data-cell="${wrongKey}"]`).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(page.locator(".cell.pending")).toHaveCount(1);
  await page.evaluate(() => {
    (window as unknown as { __flights: number }).__flights = 0;
    new MutationObserver((list) => {
      for (const m of list)
        m.addedNodes.forEach((n) => {
          if ((n as HTMLElement).classList?.contains("tile-flight"))
            (window as unknown as { __flights: number }).__flights++;
        });
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.locator(".tile-flight")).toHaveCount(0);
  const flights = await page.evaluate(
    () => (window as unknown as { __flights: number }).__flights,
  );
  expect(flights).toBe(1);
  await expect(page.locator(".cell.pending")).toHaveCount(0);
  await expect(page.locator(".in-flight")).toHaveCount(0);
  // A letra errada voltou ao lugar de onde saiu (a primeira casa do banco).
  await expect(page.locator('.letter-bank [data-slot="0"]')).not.toHaveClass(
    /slot-empty/,
  );
  const after = await slotsX(page);
  expect(after.map((x) => x.x)).toEqual(before.map((x) => x.x));
});
