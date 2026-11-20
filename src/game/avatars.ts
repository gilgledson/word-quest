/**
 * Avatares do jogador. Cada um tem os seis humores em public/art/opponents/<id>-<humor>.webp
 * (o mesmo formato dos rivais), então o rosto reage igual na partida.
 */
export interface PlayerAvatar {
  id: string;
  name: string;
}

export const PLAYER_AVATARS: PlayerAvatar[] = [
  { id: "jogador", name: "Explorador" },
  { id: "menina", name: "Aventureira" },
  { id: "garoto", name: "Caçador" },
  { id: "gatinho", name: "Gatinho" },
  { id: "panda", name: "Panda" },
  // Gerados no ChatGPT (docs/referencias/avatares), femininos e masculinos alternados.
  { id: "cientista", name: "Cientista" },
  { id: "skatista", name: "Skatista" },
  { id: "pirata", name: "Pirata" },
  { id: "detetive", name: "Detetive" },
  { id: "astronauta", name: "Astronauta" },
  { id: "cavaleiro", name: "Cavaleiro" },
  { id: "coelhinha", name: "Coelhinha" },
  { id: "latino", name: "Latino" },
  { id: "latina", name: "Latina" },
];

export const DEFAULT_AVATAR = PLAYER_AVATARS[0].id;

export const DEFAULT_NAME = "Explorador";
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
  (p.name.trim() === "" || p.name.trim() === DEFAULT_NAME) &&
  avatarOf(p.avatar).id === DEFAULT_AVATAR;

/** Avatar válido para o id salvo (ids antigos ou desconhecidos voltam ao padrão). */
export const avatarOf = (id: string | undefined): PlayerAvatar =>
  PLAYER_AVATARS.find((a) => a.id === id) ?? PLAYER_AVATARS[0];
