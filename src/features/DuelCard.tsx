import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { avatarOf } from "../game/avatars";
import { track } from "../services/telemetry";

/** Quem aparece como "o amigo" no card: alguém diferente do avatar do jogador. */
export const friendAvatarFor = (mine: string) =>
  mine === "latina" ? "garoto" : "latina";

/**
 * Card "Desafie seu amigo" da tela inicial (referência: docs/referencias/home-desafie-amigo-chatgpt.png):
 * o avatar do jogador e o de um amigo frente a frente com o escudo VS, e "Convidar" leva ao duelo
 * ao vivo (/online), onde se cria a sala e se manda o código.
 */
export function DuelCard({ avatar }: { avatar: string }) {
  const me = avatarOf(avatar).id;
  const friend = friendAvatarFor(me);
  return (
    <Link
      className="duel-card"
      to="/online"
      aria-label="Desafie seu amigo: duelo ao vivo. Convidar"
      onClick={() => track("home_duel_card")}
    >
      <span className="duel-card-title">
        <strong>Desafie seu amigo</strong>
        <small>Duelo ao vivo com um amigo</small>
      </span>
      <span className="duel-card-faces" aria-hidden="true">
        <img
          className="duel-face me"
          src={`/art/opponents/${me}-happy.webp`}
          alt=""
          draggable={false}
        />
        <img
          className="duel-vs"
          src="/art/duelo/vs.webp"
          alt=""
          draggable={false}
        />
        <img
          className="duel-face friend"
          src={`/art/opponents/${friend}-happy.webp`}
          alt=""
          draggable={false}
        />
      </span>
      <span className="duel-card-cta" aria-hidden="true">
        <Users size={20} /> Convidar
      </span>
    </Link>
  );
}
