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
  PLAYER_AVATARS.find((a) => a.id === id) ?? PLAYER_AVATARS[0];
