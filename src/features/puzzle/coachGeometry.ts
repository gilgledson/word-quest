/** Retângulo em coordenadas da janela (as mesmas de `getBoundingClientRect`). */
export type Box = { left: number; top: number; right: number; bottom: number };

/** Junta várias caixas na menor caixa que contém todas (ex.: as casas de uma palavra). */
export function unionBox(boxes: Box[]): Box | undefined {
  if (!boxes.length) return undefined;
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    top: Math.min(...boxes.map((b) => b.top)),
    right: Math.max(...boxes.map((b) => b.right)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

/** Aumenta a caixa em `pad` px para cada lado, sem passar da tela. */
export function padBox(b: Box, pad: number, w: number, h: number): Box {
  return {
    left: Math.max(0, b.left - pad),
    top: Math.max(0, b.top - pad),
    right: Math.min(w, b.right + pad),
    bottom: Math.min(h, b.bottom + pad),
  };
}

/**
 * Cobre a tela (`w` × `h`) inteira menos os buracos, com retângulos que não se sobrepõem. A tela é
 * fatiada em faixas horizontais nas bordas de cima e de baixo dos buracos; em cada faixa, o que
 * fica entre os buracos que a atravessam vira um retângulo. É a camada que barra os toques fora
 * das áreas liberadas do tutorial.
 */
export function complementRects(w: number, h: number, holes: Box[]): Box[] {
  const clip = holes
    .map((b) => ({
      left: Math.max(0, b.left),
      top: Math.max(0, b.top),
      right: Math.min(w, b.right),
      bottom: Math.min(h, b.bottom),
    }))
    .filter((b) => b.right > b.left && b.bottom > b.top);
  const ys = [
    ...new Set([0, h, ...clip.flatMap((b) => [b.top, b.bottom])]),
  ].sort((a, b) => a - b);
  const out: Box[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const top = ys[i];
    const bottom = ys[i + 1];
    if (bottom <= top) continue;
    // Buracos que atravessam esta faixa, da esquerda para a direita, já fundidos quando se tocam.
    const spans = clip
      .filter((b) => b.top <= top && b.bottom >= bottom)
      .map((b) => [b.left, b.right] as const)
      .sort((a, b) => a[0] - b[0]);
    let x = 0;
    for (const [l, r] of spans) {
      if (l > x) out.push({ left: x, top, right: l, bottom });
      x = Math.max(x, r);
    }
    if (x < w) out.push({ left: x, top, right: w, bottom });
  }
  return out;
}
