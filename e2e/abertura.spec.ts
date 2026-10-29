import { expect, test } from "@playwright/test";

test("a abertura mostra o estúdio e o jogo e depois libera a home (?splash=1)", async ({
  page,
}) => {
  await page.goto("/?splash=1");
  const abertura = page.getByRole("status", { name: /Lunara Games/ });
  await expect(abertura).toBeVisible();
  await expect(page.locator(".splash-studio.on img")).toBeVisible();
  await expect(abertura).toBeHidden({ timeout: 8000 });
  await expect(
    page.getByRole("link", { name: /Continuar aventura/ }),
  ).toBeVisible();
});

test("sem ?splash=1 a abertura é pulada em automação", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".studio-splash")).toHaveCount(0);
});

test("tocar durante a abertura pula a marca do estúdio", async ({ page }) => {
  await page.goto("/?splash=1");
  await expect(page.locator(".splash-studio.on")).toBeVisible();
  await page.locator(".studio-splash").click();
  await expect(page.locator(".splash-studio.on")).toHaveCount(0);
});
