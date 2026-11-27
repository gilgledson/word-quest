import { tr } from "../i18n";
import { gameText } from "../i18n/game";

/**
 * Avatares do jogador. Cada um tem os seis humores em public/art/opponents/<id>-<humor>.webp
 * (o mesmo formato dos rivais), então o rosto reage igual na partida.
 */
export interface PlayerAvatar {
  id: string;
  name: string;
}

type AvatarId = keyof typeof gameText.avatars;
/** Nome no idioma em uso, lido a cada acesso. */
const avatar = (id: AvatarId): PlayerAvatar => ({
  id,
  get name() {
    return gameText.avatars[id];
  },
});

export const PLAYER_AVATARS: PlayerAvatar[] = [
  avatar("jogador"),
  avatar("menina"),
  avatar("garoto"),
  avatar("gatinho"),
  avatar("panda"),
  // Gerados no ChatGPT (docs/referencias/avatares), femininos e masculinos alternados.
  avatar("cientista"),
  avatar("skatista"),
  avatar("pirata"),
  avatar("detetive"),
  avatar("astronauta"),
  avatar("cavaleiro"),
  avatar("coelhinha"),
  avatar("latino"),
  avatar("latina"),
];

/**
 * Avatares premium: comprados com moedas na loja (aba Perfil), com os mesmos seis humores. Ficam
 * fora de `PLAYER_AVATARS` (a lista gratuita, usada também nos rivais da procura); `avatarOf` os
 * reconhece. Pedidos pelo dono em 27/11/2026: femininos e masculinos, de 600 a 1.000 moedas.
 */
export const PREMIUM_AVATARS: PlayerAvatar[] = [
  avatar("viking"),
  avatar("guerreira"),
  avatar("ninja"),
  avatar("samurai"),
  avatar("mago"),
  avatar("feiticeira"),
  avatar("rei"),
  avatar("rainha"),
];
/**
 * Avatares premium da cultura indiana (pedidos pelo dono em 27/11/2026: a Índia é o maior público).
 * Esporte, festivais, dança e realeza; sem figuras religiosas.
 */
export const INDIA_AVATARS: PlayerAvatar[] = [
  avatar("criquete"),
  avatar("holi"),
  avatar("diwali"),
  avatar("dancarina"),
  avatar("maraja"),
  avatar("marani"),
  // Segunda leva (27/11/2026): cinema, ciência, chá, música e esporte.
  avatar("bollywood"),
  avatar("diva"),
  avatar("espacial"),
  avatar("chai"),
  avatar("citara"),
  avatar("kabaddi"),
];
/** Todos os premium (heróis e Índia). */
export const ALL_PREMIUM_AVATARS = [...PREMIUM_AVATARS, ...INDIA_AVATARS];
export const AVATAR_PRICES: Record<string, number> = {
  viking: 600,
  guerreira: 600,
  ninja: 700,
  samurai: 700,
  mago: 800,
  feiticeira: 800,
  rei: 1000,
  rainha: 1000,
  criquete: 600,
  holi: 600,
  diwali: 700,
  dancarina: 800,
  maraja: 1000,
  marani: 1000,
  bollywood: 800,
  diva: 800,
  espacial: 900,
  chai: 600,
  citara: 700,
  kabaddi: 600,
};
export const isPremiumAvatar = (id: string) => id in AVATAR_PRICES;

export const DEFAULT_AVATAR = PLAYER_AVATARS[0].id;

export const DEFAULT_NAME = "Explorador";
/** Nome padrão em cada idioma (o jogador em inglês começa como "Explorer"). */
export const DEFAULT_NAMES = [DEFAULT_NAME, "Explorer"];
export const defaultName = () => tr(DEFAULT_NAME, "Explorer");
/** Tamanho do nome que o amigo vê no duelo ao vivo. */
export const NAME_MIN = 2;
export const NAME_MAX = 20;

/**
 * Antes do duelo ao vivo o amigo precisa saber quem é quem: pede nome e avatar a quem ainda está
 * com os padrões e nunca confirmou (quem já mudou um dos dois no Perfil não é incomodado).
 */
export const needsProfile = (p: {
  name: string;
  avatar: string;
  profileSet?: boolean;
}) =>
  !p.profileSet &&
  (p.name.trim() === "" || DEFAULT_NAMES.includes(p.name.trim())) &&
  avatarOf(p.avatar).id === DEFAULT_AVATAR;

/** Avatar válido para o id salvo (ids antigos ou desconhecidos voltam ao padrão). */
export const avatarOf = (id: string | undefined): PlayerAvatar =>
  PLAYER_AVATARS.find((a) => a.id === id) ??
  ALL_PREMIUM_AVATARS.find((a) => a.id === id) ??
  PLAYER_AVATARS[0];

/** O jogador pode usar este avatar: os gratuitos sempre; os premium, depois de comprar. */
export const ownsAvatar = (p: { avatars?: string[] }, id: string) =>
  !isPremiumAvatar(id) || (p.avatars ?? []).includes(id);

/** Avatares para escolher (Perfil e antes do duelo ao vivo): os gratuitos e os premium comprados. */
export const pickableAvatars = (p: { avatars?: string[] }) => [
  ...PLAYER_AVATARS,
  ...ALL_PREMIUM_AVATARS.filter((a) => ownsAvatar(p, a.id)),
];

/** Compra o avatar premium e já passa a usá-lo. Sem moedas ou já comprado, nada muda. */
export function buyAvatar<
  P extends { coins: number; avatar: string; avatars?: string[] },
>(p: P, id: string): P {
  const price = AVATAR_PRICES[id];
  if (!price || ownsAvatar(p, id) || p.coins < price) return p;
  return {
    ...p,
    coins: p.coins - price,
    avatars: [...(p.avatars ?? []), id],
    avatar: id,
  };
}
