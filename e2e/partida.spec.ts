import { expect, test, type Locator, type Page } from "@playwright/test";
import levels from "../src/data/levels.json" with { type: "json" };

const level = levels[0];
const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

const score = (page: Page, who: "player" | "rival") =>
  page.getByTestId(`duelist-${who}`).locator(".duelist-score strong");
const bank = (page: Page) =>
  page.getByRole("group", { name: "Letras do banco" });
const tile = (page: Page, letter: string) =>
  bank(page).getByRole("button", { name: `Inserir letra ${letter}` });
const clue = (page: Page, text: string) =>
  page.locator(`[aria-label^="Pista: ${text},"]`);

/** Primeira palavra cuja inicial está no banco; devolve as letras que dá para encaixar em ordem. */
async function pickWord(page: Page) {
  for (const word of level.words) {
    const letters = [...strip(word.answer)];
    if ((await tile(page, letters[0]).count()) > 0) return { word, letters };
  }
  throw new Error("Nenhuma palavra começa com uma letra do banco");
}
/** Toca nas peças que formam o começo da palavra e devolve quantas foram colocadas. */
async function fill(page: Page, letters: string[]) {
  let placed = 0;
  for (const letter of letters) {
    const t = tile(page, letter).first();
    if (!(await t.count())) break;
    await t.click();
    placed++;
  }
  return placed;
}
const box = async (l: Locator) => (await l.boundingBox())!;

test.beforeEach(async ({ page }) => {
  await page.goto("/play/vila-1");
  await expect(page.locator(".board .cell")).toHaveCount(80);
});

test("a fase cabe na tela de 360×800, sem rolagem", async ({ page }) => {
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
  const board = await box(page.locator(".board"));
  expect(board.x).toBeGreaterThanOrEqual(0);
  expect(board.x + board.width).toBeLessThanOrEqual(360);
  expect(board.y + board.height).toBeLessThanOrEqual(800);
  // Banco e botões de ação visíveis dentro da tela.
  await expect(bank(page).getByRole("button")).toHaveCount(5);
  for (const name of ["Trocar", "Passar a vez", "Dica"])
    await expect(page.getByRole("button", { name })).toBeVisible();
  await expect(score(page, "player")).toHaveText("0");
  await expect(score(page, "rival")).toHaveText("0");
  // O selo de turno é explícito e os nomes cabem inteiros no placar.
  await expect(
    page.getByRole("status").filter({ hasText: "sua vez" }),
  ).toBeVisible();
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll(".duelist-name")].some(
      (e) => e.scrollWidth > e.clientWidth,
    ),
  );
  expect(clipped).toBe(false);
});

test("joga um turno: coloca letras, confirma, o oponente responde e o progresso persiste", async ({
  page,
}) => {
  const { word, letters } = await pickWord(page);
  await clue(page, word.clue).first().click();
  const placed = await fill(page, letters);
  expect(placed).toBeGreaterThan(0);
  await expect(bank(page).getByRole("button")).toHaveCount(5 - placed);
  await expect(page.locator(".board .cell.pending")).toHaveCount(placed);

  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.locator(".board .cell.correct")).toHaveCount(placed);
  await expect(score(page, "player")).not.toHaveText("0");
  const mine = Number(await score(page, "player").innerText());
  expect(mine).toBeGreaterThanOrEqual(placed);

  // A vez passa para o oponente e volta, com o banco reposto.
  await expect(page.getByText("vez dele ▶")).toBeVisible();
  await expect(page.getByText("◀ sua vez")).toBeVisible({ timeout: 15_000 });
  await expect(bank(page).getByRole("button")).toHaveCount(5);
  expect(Number(await score(page, "player").innerText())).toBe(mine);

  // Recarregar a página retoma a mesma partida.
  const locked = await page.locator(".board .cell.correct").count();
  expect(locked).toBeGreaterThanOrEqual(placed);
  await page.reload();
  await expect(page.locator(".board .cell")).toHaveCount(80);
  await expect(score(page, "player")).toHaveText(String(mine));
  await expect(page.locator(".board .cell.correct")).toHaveCount(locked);
});

test("arrasta uma peça do banco até uma casa da grade", async ({ page }) => {
  const { word, letters } = await pickWord(page);
  const cell = page.locator(`.cell.letter[data-words~="${word.id}"]`).first();
  const from = await box(tile(page, letters[0]).first());
  const to = await box(cell);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(cell).toHaveClass(/pending/);
  await expect(cell).toHaveText(letters[0]);
  await expect(bank(page).getByRole("button")).toHaveCount(4);
});

test("troca de letras abre e fecha; girar o tabuleiro mantém a grade na tela", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Trocar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Trocar letras" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("0/5 selecionadas");
  await dialog
    .getByRole("button", { name: /Trocar letra/ })
    .first()
    .click();
  await expect(dialog).toContainText("1/5 selecionadas");
  await expect(dialog).toContainText("Custo: 10 moedas");
  await expect(dialog).toContainText("Saldo depois: 90");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();

  const rotate = page.getByRole("button", { name: "Girar tabuleiro" });
  const before = await rotate.getAttribute("aria-pressed");
  await rotate.click();
  await expect(rotate).not.toHaveAttribute("aria-pressed", before!);
  const board = await box(page.locator(".board"));
  expect(board.x).toBeGreaterThanOrEqual(0);
  expect(board.x + board.width).toBeLessThanOrEqual(360);
  expect(board.y + board.height).toBeLessThanOrEqual(800);
});
