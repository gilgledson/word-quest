import { expect, test } from "@playwright/test";

test("páginas secundárias: cabeçalho numa linha só e sem rolagem lateral", async ({
  page,
}) => {
  for (const path of ["/casual", "/daily", "/profile"]) {
    await page.goto(path);
    await expect(page.locator("header .brand")).toBeVisible();
    const tops = await page.evaluate(() =>
      [...document.querySelectorAll("header > *")].map((e) =>
        Math.round(
          e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2,
        ),
      ),
    );
    // Logo, carteira e botão de som alinhados na mesma linha.
    expect(Math.max(...tops) - Math.min(...tops), path).toBeLessThan(12);
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowX, path).toBeLessThanOrEqual(0);
  }
});

test("mapa: a fase 5 é o chefe e o portão mostra o que falta", async ({
  page,
}) => {
  await page.goto("/map");
  await expect(page.getByRole("link", { name: /Fase 5, chefe/ })).toBeVisible();
  await expect(page.getByText(/Faltam 5 fases/)).toBeVisible();
});

test("perfil mostra as conquistas", async ({ page }) => {
  await page.goto("/profile");
  const box = page.getByLabel("Suas conquistas");
  await expect(box).toContainText("Fases");
  await expect(box).toContainText("0/25");
});
