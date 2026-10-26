/**
 * Avatares do jogador. Cada um tem os seis humores em public/art/opponents/<id>-<humor>.png
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
];

export const DEFAULT_AVATAR = PLAYER_AVATARS[0].id;

/** Avatar válido para o id salvo (ids antigos ou desconhecidos voltam ao padrão). */
export const avatarOf = (id: string | undefined): PlayerAvatar =>
  PLAYER_AVATARS.find((a) => a.id === id) ?? PLAYER_AVATARS[0];
