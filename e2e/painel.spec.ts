import { expect, test, type Page } from "@playwright/test";
import { dismissTour } from "./tour";

const open = async (page: Page) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await dismissTour(page);
};
const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!;

test("o cabeçalho compacto deixa as casas e as pistas maiores, sem rolagem", async ({
  page,
}) => {
  await open(page);
  const cell = await box(page, ".board .cell");
  // Antes eram 33 px (pistas de 6,6 px); a meta é passar de 40 px.
  expect(cell.width).toBeGreaterThanOrEqual(40);
  const clueFont = await page
    .locator(".clue-half span")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(clueFont).toBeGreaterThanOrEqual(8);
  const o = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(o.x).toBeLessThanOrEqual(0);
  expect(o.y).toBeLessThanOrEqual(0);
});

test("a faixa de turno fica dentro do painel e não cobre o selo VS", async ({
  page,
}) => {
  await open(page);
  const panel = await box(page, ".versus-score");
  const vs = await box(page, ".vs-badge");
  const turn = await box(page, ".versus-score .turn-arrow");
  expect(turn.y).toBeGreaterThanOrEqual(panel.y);
  expect(turn.y + turn.height).toBeLessThanOrEqual(panel.y + panel.height + 1);
  // O selo termina antes de a faixa começar.
  expect(vs.y + vs.height).toBeLessThanOrEqual(turn.y + 1);
});

test("o painel da palavra mostra o progresso e o bônus", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("word-progress")).toHaveText(
    "0/7 · restam 7 · +7 ao completar",
  );
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await expect(page.getByTestId("word-progress")).toHaveText(
    "1/7 · restam 6 · +7 ao completar",
  );
});

test("telas pequenas (320×568) também cabem sem rolagem", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  const o = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(o.x).toBeLessThanOrEqual(0);
  expect(o.y).toBeLessThanOrEqual(0);
  const turn = await box(page, ".versus-score .turn-arrow");
  const panel = await box(page, ".versus-score");
  expect(turn.x).toBeGreaterThanOrEqual(panel.x);
  expect(turn.x + turn.width).toBeLessThanOrEqual(panel.x + panel.width);
});

test("as setas encostam na linha da grade e ficam centradas na pista", async ({
  page,
}) => {
  await open(page);
  const geometry = async (kind: "right" | "down") => {
    const arrow = page.locator(`.cell.clue .clue-arrow.to-${kind}`).first();
    // A metade da pista que carrega a seta (a casa inteira quando a pista é única).
    const half = arrow.locator("xpath=..");
    return { a: (await arrow.boundingBox())!, h: (await half.boundingBox())! };
  };
  const right = await geometry("right");
  // A base da seta começa exatamente na borda da casa (a linha da grade)...
  expect(Math.abs(right.a.x - (right.h.x + right.h.width))).toBeLessThanOrEqual(
    1,
  );
  // ...e ela fica no meio da altura da pista.
  expect(
    Math.abs(right.a.y + right.a.height / 2 - (right.h.y + right.h.height / 2)),
  ).toBeLessThanOrEqual(1);
  const down = await geometry("down");
  expect(Math.abs(down.a.y - (down.h.y + down.h.height))).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs(down.a.x + down.a.width / 2 - (down.h.x + down.h.width / 2)),
  ).toBeLessThanOrEqual(1);
  // O texto da pista não carrega mais o glifo da seta.
  const text = await page.locator(".cell.clue").first().innerText();
  expect(text).not.toMatch(/[→↓↑]/);
});
