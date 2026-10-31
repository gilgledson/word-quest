import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { dismissTour } from "./tour";

const timerToggle = (page: Page) => page.getByLabel("Relógio do turno (25 s)");
/** Abre a fase 1 contra o rival difícil e dispensa o tutorial. */
const startDuel = async (page: Page) => {
  await page.goto("/play/vila-1?vs=dificil");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await dismissTour(page);
  await page.getByRole("button", { name: "Pular" }).click();
};

test("o relógio é opcional: vem desligado e a preferência é gravada", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(timerToggle(page)).not.toBeChecked();
  await timerToggle(page).check();
  await page.reload();
  await expect(timerToggle(page)).toBeChecked();
  await startDuel(page);
  await expect(page.getByRole("timer")).toBeVisible();
  // Desligando, a barra some na partida seguinte.
  await page.goto("/profile");
  await timerToggle(page).uncheck();
  await page.goto("/play/vila-1?vs=dificil");
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await expect(page.getByRole("timer")).toHaveCount(0);
});

test("ao zerar o relógio a vez passa sozinha e o rival joga", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/profile");
  await timerToggle(page).check();
  await startDuel(page);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText("vez do oponente ▶")).toHaveCount(0);
  await page.clock.fastForward(26_000);
  await expect(page.getByText("vez do oponente ▶")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  // O rival termina a jogada e a vez volta, com o relógio reiniciado.
  await page.clock.fastForward(6_000);
  await expect(page.getByText("vez do oponente ▶")).toHaveCount(0);
  await expect(page.getByRole("timer")).toBeVisible();
});

test("o rival coloca as letras uma a uma antes de confirmar", async ({
  page,
}) => {
  await startDuel(page);
  await page.getByRole("button", { name: "Passar a vez" }).click();
  const placed = page.locator(".cell.bot-reveal");
  const counts: number[] = [];
  const start = Date.now();
  while (Date.now() - start < 8_000) {
    counts.push(await placed.count());
    if (
      counts.at(-1) === 0 &&
      (await page.getByText("vez do oponente ▶").count()) === 0
    )
      break;
    await page.waitForTimeout(40);
  }
  expect(Math.max(...counts)).toBeGreaterThan(0);
  // Terminada a jogada, nenhuma letra fica "em reveal" e o jogador volta a jogar.
  await expect(placed).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Passar a vez" }),
  ).toBeEnabled();
});

test("com o relógio e o rival jogando, a tela segue acessível e sem rolagem", async ({
  page,
}) => {
  await page.goto("/profile");
  await timerToggle(page).check();
  await startDuel(page);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
});
