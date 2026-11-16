import { useEffect, useState } from "react";
import { contentStore } from "../services/repository";

/**
 * Imagens do conteúdo baixado. As que vêm no app (/art/...) são usadas direto; as do servidor são
 * baixadas uma vez, guardadas no aparelho (IndexedDB) e servidas de lá nas próximas vezes, inclusive
 * sem internet. Enquanto uma imagem não chega, a tela mostra a alternativa que recebeu.
 */
export const isRemote = (src: string | undefined): src is string =>
  !!src && src.startsWith("https://");

/** Endereço local (blob:) de cada imagem do servidor já lida nesta sessão. */
const ready = new Map<string, string>();
const loading = new Map<string, Promise<string | undefined>>();

/** O endereço que a tela pode usar agora: a própria imagem do app, a baixada, ou nada ainda. */
export const assetNow = (src: string | undefined) =>
  isRemote(src) ? ready.get(src) : src;

/** Lê a imagem do aparelho ou, na primeira vez, do servidor. Falhas ficam em silêncio (a tela tem alternativa). */
export function loadAsset(src: string): Promise<string | undefined> {
  if (!isRemote(src)) return Promise.resolve(src);
  const done = ready.get(src);
  if (done) return Promise.resolve(done);
  let job = loading.get(src);
  if (!job) {
    job = (async () => {
      try {
        let blob = await contentStore.asset(src).catch(() => undefined);
        if (!blob) {
          const res = await fetch(src);
          if (!res.ok) return undefined;
          blob = await res.blob();
          if (!blob.type.startsWith("image/")) return undefined;
          await contentStore.saveAsset(src, blob).catch(() => {});
        }
        if (typeof URL.createObjectURL !== "function") return undefined;
        const local = URL.createObjectURL(blob);
        ready.set(src, local);
        return local;
      } catch {
        return undefined;
      } finally {
        loading.delete(src);
      }
    })();
    loading.set(src, job);
  }
  return job;
}

/** Baixa antes de precisar, poucas por vez para não disputar a rede com o jogo. */
export async function prefetchAssets(urls: string[], parallel = 3) {
  const queue = [...new Set(urls.filter(isRemote))].filter(
    (u) => !ready.has(u),
  );
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift())
      await loadAsset(url);
  };
  await Promise.all(Array.from({ length: parallel }, worker));
}

/** A imagem para desenhar: a do conteúdo quando estiver pronta, senão `fallback`. */
export function useAsset(src: string | undefined, fallback?: string) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!isRemote(src) || ready.has(src)) return;
    let alive = true;
    void loadAsset(src).then((local) => {
      if (alive && local) rerender((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return assetNow(src) ?? fallback;
}

/** Só para testes: esquece o que foi lido nesta sessão. */
export function resetAssets() {
  ready.clear();
  loading.clear();
}
