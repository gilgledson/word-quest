import { expect, type Page } from "@playwright/test";
import { waitSaved } from "./storage";

/**
 * Pula o tutorial da fase 1 e reabre a fase com o banco sorteado de sempre, para os testes das
 * mecânicas comuns. O primeiro "Pular" pula só a palavra guiada (as dicas de 4 passos seguem); o
 * segundo, nas dicas, encerra o tutorial. A sessão guiada ainda não foi gravada (nenhuma jogada),
 * então a reabertura começa a partida normal.
 */
export async function dismissTour(page: Page) {
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByRole("region", { name: "Tutorial" })).toHaveCount(0);
  await page
    .locator(".tutorial-tip")
    .getByRole("button", { name: "Pular" })
    .click();
  await waitSaved(page, "tutorialDone", true);
  await page.reload();
  await expect(page.locator(".board .cell").first()).toBeVisible();
}
