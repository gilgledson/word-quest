import { expect, test, type Page } from "@playwright/test";

const dialog = (page: Page) =>
  page.locator("#react-joyride-portal [role=alertdialog]");
const open = async (page: Page) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
};

const inside = async (page: Page) => {
  // O balão fica inteiro dentro da tela de 360×800.
  const box = (await dialog(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(800);
};

test("as dicas surgem uma a uma, quando a mecânica aparece", async ({
  page,
}) => {
  await open(page);
  await expect(dialog(page)).toContainText("Comece pela grade");
  await inside(page);
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(dialog(page)).toHaveCount(0);
  // Sem o overlay, a partida responde ao toque; a primeira letra traz a dica de confirmar.
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await expect(page.locator(".cell.pending")).toHaveCount(1);
  await expect(dialog(page)).toContainText("Confirme a jogada");
  await inside(page);
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(dialog(page)).toHaveCount(0);
  // Ao confirmar, é a vez do rival: surge a dica do duelo.
  await page.getByRole("button", { name: /^Confirmar/ }).click();
  await expect(dialog(page)).toContainText("vez do rival");
  await inside(page);
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test("‘Dispensar’ desliga todas as dicas e a escolha é lembrada", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Dispensar" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await page.waitForTimeout(800);
  await expect(dialog(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await page.waitForTimeout(1500);
  await expect(dialog(page)).toHaveCount(0);
});

test("o overlay bloqueia a partida enquanto o tour está aberto e nada fica preso depois", async ({
  page,
}) => {
  await open(page);
  await expect(dialog(page)).toBeVisible();
  const before = await page.locator(".cell.pending").count();
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click({ force: true })
    .catch(() => {});
  expect(await page.locator(".cell.pending").count()).toBe(before);
  await page.getByRole("button", { name: "Dispensar" }).click();
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await expect(page.locator(".cell.pending")).toHaveCount(1);
});

test("a apresentação do curinga aparece uma vez e depois não volta", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Dispensar" }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await page
    .getByRole("button", { name: /^Inserir letra/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  const inject = () =>
    page.evaluate(
      () =>
        new Promise<void>((res, rej) => {
          const o = indexedDB.open("wordquest");
          o.onerror = () => rej(o.error);
          o.onsuccess = () => {
            const store = o.result
              .transaction("players", "readwrite")
              .objectStore("players");
            const g = store.get("local");
            g.onsuccess = () => {
              const row = g.result;
              const s =
                row.data.sessions["vs:vila-1:medio"] ??
                Object.values(row.data.sessions)[0];
              s.supply = s.supply.filter((id: string) => id !== "joker");
              s.rack = [
                ...s.rack.filter((id: string) => id !== "joker"),
                "joker",
              ];
              store.put(row).onsuccess = () => res();
            };
          };
        }),
    );
  await inject();
  await page.reload();
  await expect(dialog(page)).toContainText("Chegou o curinga");
  await page.getByRole("button", { name: "Entendi" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(dialog(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Inserir curinga" }),
  ).toBeVisible();
});
