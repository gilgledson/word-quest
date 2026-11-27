/**
 * Molduras de perfil: o primeiro jeito de gastar moedas que não mexe na partida. A moldura fica em
 * volta do avatar no duelo (o rival vê), no perfil, na busca de oponente e no card da tela inicial.
 * Mockup aprovado pelo dono em 26/11/2026: docs/referencias/cosmeticos/molduras-perfil-chatgpt.png;
 * a arte de cada uma (fundo transparente) fica em public/art/molduras/<id>.webp.
 */
import type { Player } from "../services/repository";

/** Molduras clássicas (a primeira leva, 26/11/2026). */
export const CLASSIC_FRAMES = [
  "bronze",
  "prata",
  "floresta",
  "deserto",
  "ilhas",
  "ouro",
  "coroa",
  "lendaria",
] as const;
/**
 * Molduras rústicas (a segunda leva, 27/11/2026, pedida pelo dono para o público masculino: metal,
 * fogo, pedra, dragão). Mesmo formato das clássicas; sem caveiras nem sangue (classificação livre).
 */
export const RUSTIC_FRAMES = [
  "ferro",
  "cacador",
  "runica",
  "tempestade",
  "lava",
  "fogo",
  "dragao",
  "cavaleiro",
] as const;
export const FRAME_IDS = [...CLASSIC_FRAMES, ...RUSTIC_FRAMES] as const;
export type FrameId = (typeof FRAME_IDS)[number];

/** Preço de cada moldura em moedas (do mockup: da mais simples à lendária). */
export const FRAME_PRICES: Record<FrameId, number> = {
  bronze: 150,
  prata: 200,
  floresta: 250,
  deserto: 300,
  ilhas: 300,
  ouro: 350,
  coroa: 400,
  lendaria: 500,
  ferro: 200,
  cacador: 250,
  runica: 300,
  tempestade: 350,
  lava: 400,
  fogo: 450,
  dragao: 450,
  cavaleiro: 500,
};

/**
 * Quanto do quadrado da arte é o furo do meio (diâmetro do furo ÷ lado), medido em cada arquivo:
 * a moldura é desenhada maior que o avatar nessa proporção para o rosto caber no furo.
 */
export const FRAME_HOLE: Record<FrameId, number> = {
  bronze: 0.7,
  prata: 0.606,
  floresta: 0.636,
  deserto: 0.536,
  ilhas: 0.547,
  ouro: 0.601,
  coroa: 0.47,
  lendaria: 0.503,
  ferro: 0.586,
  cacador: 0.556,
  runica: 0.517,
  tempestade: 0.524,
  lava: 0.526,
  fogo: 0.529,
  dragao: 0.538,
  cavaleiro: 0.512,
};

export const isFrameId = (v: unknown): v is FrameId =>
  typeof v === "string" && (FRAME_IDS as readonly string[]).includes(v);

/** Arte da moldura (aro com o centro vazio, fundo transparente). */
export const frameArt = (id: FrameId) => `/art/molduras/${id}.webp`;

/** Molduras que o jogador já tem. */
export const ownedFrames = (p: Pick<Player, "frames">): FrameId[] =>
  (p.frames ?? []).filter(isFrameId);

export const ownsFrame = (p: Pick<Player, "frames">, id: FrameId) =>
  ownedFrames(p).includes(id);

/** Moldura em uso (só vale se o jogador a tem). */
export const currentFrame = (
  p: Pick<Player, "frame" | "frames">,
): FrameId | undefined =>
  isFrameId(p.frame) && ownsFrame(p, p.frame) ? p.frame : undefined;

/** Compra a moldura e já passa a usá-la. Sem moedas ou já comprada, nada muda. */
export function buyFrame(p: Player, id: FrameId): Player {
  const price = FRAME_PRICES[id];
  if (ownsFrame(p, id) || p.coins < price) return p;
  return {
    ...p,
    coins: p.coins - price,
    frames: [...ownedFrames(p), id],
    frame: id,
  };
}

/** Passa a usar uma moldura que já tem (ou nenhuma, com `undefined`). */
export function wearFrame(p: Player, id: FrameId | undefined): Player {
  if (id && !ownsFrame(p, id)) return p;
  return { ...p, frame: id };
}
