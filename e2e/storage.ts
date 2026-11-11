import { expect, type Page } from "@playwright/test";

/** Lê um campo do jogador gravado no IndexedDB (banco "wordquest", tabela "players", id "local"). */
const savedField = (page: Page, field: string) =>
  page.evaluate(
    (name) =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open("wordquest");
        open.onerror = () => resolve(undefined);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("players"))
            return resolve(undefined);
          const get = db
            .transaction("players")
            .objectStore("players")
            .get("local");
          get.onsuccess = () =>
            resolve(
              (get.result?.data as Record<string, unknown> | undefined)?.[name],
            );
          get.onerror = () => resolve(undefined);
        };
      }),
    field,
  );

/**
 * Espera a preferência chegar ao IndexedDB. A gravação é assíncrona: navegar com `goto` ou
 * recarregar logo depois de mudar uma opção pode descartar a escrita ainda em andamento.
 */
export async function waitSaved(page: Page, field: string, value: unknown) {
  await expect.poll(() => savedField(page, field)).toEqual(value);
}
