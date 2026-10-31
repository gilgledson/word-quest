import { expect, type Page } from "@playwright/test";

/** Dispensa o tour de apresentação (react-joyride) que abre sozinho na primeira vez da fase 1. */
export async function dismissTour(page: Page) {
  await page.getByRole("button", { name: "Dispensar" }).click();
  await expect(
    page.locator("#react-joyride-portal [role=alertdialog]"),
  ).toHaveCount(0);
}
