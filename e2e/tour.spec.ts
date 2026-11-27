import { expect, test, type Locator, type Page } from "@playwright/test";
import { dismissTour } from "./tour";
import { waitSaved } from "./storage";

const dialog = (page: Page) =>
  page.locator("#react-joyride-portal [role=alertdialog]");
const guide = (page: Page) => page.getByRole("region", { name: "Tutorial" });
const open = async (page: Page) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(36);
  await expect(guide(page)).toBeVisible();
};
const center = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/** Arrasta com o mouse, de verdade, a peça sugerida até a casa sugerida (através da tela escura). */
async function dragSuggested(page: Page) {
  const from = await center(page.locator(".coach-ring.tile"));
  const to = await center(page.locator(".coach-ring:not(.tile)"));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
    steps: 6,
  });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}
const progress = (page: Page) =>
  guide(page).locator(".coach-progress").innerText();

test("jogada guiada: arrasta as letras pela tela escura, confirma e segue para a dica do duelo", async ({
  page,
}) => {
  await open(page);
  const height = () =>
    page.evaluate(() => document.querySelector(".board-area")!.clientHeight);
  const h0 = await height();
  await expect(guide(page)).toContainText("Monte sua primeira palavra!");
  await expect(
    page.getByRole("button", { name: /Passar a vez/ }),
  ).toBeDisabled();
  for (let i = 1; i <= 4; i++) {
    await dragSuggested(page);
    if (i < 4) await expect(guide(page)).toContainText(`${i} de 4 letras`);
  }
  await expect(guide(page)).toContainText("Palavra completa!");
  await expect(guide(page)).toContainText(/\+\d+ pontos/);
  // O guia não mexe no tamanho da grade.
  expect(await height()).toBe(h0);
  await page.getByRole("button", { name: /^Confirmar/ }).click();
  await expect(guide(page)).toHaveCount(0);
  await expect(dialog(page)).toContainText("Um de cada vez");
  // O "Entendi" da dica (o painel do tutorial também tem um, quando a vez volta ao jogador).
  await dialog(page).getByRole("button", { name: "Entendi" }).click();
  // Se o rival já jogou, a próxima dica (trocar) pode abrir logo em seguida.
  await expect(dialog(page)).not.toContainText("Um de cada vez");
  await waitSaved(page, "tipsSeen", ["palavra", "duelo"]);
});

test("toques fora das letras e da palavra não chegam ao jogo", async ({
  page,
}) => {
  await open(page);
  const before = await progress(page);
  // "Trocar" fica sob a tela escura: o toque é barrado e o diálogo não abre.
  const swap = await center(page.getByRole("button", { name: "Trocar" }));
  await page.mouse.click(swap.x, swap.y);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Uma pista qualquer da grade também não responde.
  const clue = await center(page.locator(".board .cell.clue").first());
  await page.mouse.click(clue.x, clue.y);
  expect(await progress(page)).toBe(before);
  // As letras continuam livres.
  await dragSuggested(page);
  await expect(guide(page)).toContainText("1 de 4 letras");
});

test.describe("em 360×640", () => {
  test.use({ viewport: { width: 360, height: 640 } });
  test("o Pular cabe na tela e, girando o celular, os recortes acompanham o banco", async ({
    page,
  }) => {
    await open(page);
    const skip = page.getByRole("button", { name: "Pular" });
    await expect(skip).toBeInViewport();
    await dragSuggested(page);
    await page.setViewportSize({ width: 640, height: 360 });
    await expect
      .poll(async () => {
        const bank = (await page.locator(".letter-bank").boundingBox())!;
        const holes = await page
          .locator("#coach-mask rect[fill=black]")
          .evaluateAll((rs) =>
            rs.map((r) => ({
              x: Number(r.getAttribute("x")),
              y: Number(r.getAttribute("y")),
            })),
          );
        // Um dos recortes fica em volta do banco (6 px de folga).
        return holes.some(
          (h) =>
            Math.abs(h.x - (bank.x - 6)) < 3 &&
            Math.abs(h.y - (bank.y - 6)) < 3,
        );
      })
      .toBe(true);
    await expect(skip).toBeInViewport();
    await skip.click();
    await expect(guide(page)).toHaveCount(0);
    // Pula só a palavra guiada: as dicas de 4 passos continuam.
    await waitSaved(page, "tipsSeen", ["palavra"]);
    await expect(page.locator(".tutorial-tip")).toBeInViewport();
  });
});

test("‘Dispensar’ desliga as dicas seguintes e a escolha é lembrada", async ({
  page,
}) => {
  await open(page);
  for (let i = 0; i < 4; i++) await dragSuggested(page);
  await page.getByRole("button", { name: /^Confirmar/ }).click();
  await expect(dialog(page)).toContainText("Um de cada vez");
  await page.getByRole("button", { name: "Dispensar" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await waitSaved(page, "tourDone", true);
  await page.reload();
  await expect(page.locator(".board .cell")).toHaveCount(36);
  await page.waitForTimeout(1500);
  await expect(dialog(page)).toHaveCount(0);
});

test("a apresentação do curinga aparece uma vez e depois não volta", async ({
  page,
}) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(36);
  await dismissTour(page);
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
