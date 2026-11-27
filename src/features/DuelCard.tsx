import { Link } from "react-router-dom";
import { Play, UserPlus } from "lucide-react";
import { avatarOf } from "../game/avatars";
import { currentFrame } from "../game/frames";
import { FrameArt } from "../components/FrameArt";
import { usePlayer } from "../stores/player";
import { track } from "../services/telemetry";
import { homeT as t } from "../i18n/screens";
import { onlineText as onlineT } from "../i18n/online";
import { useMatchItems } from "./myMatches";

/** Quem aparece como "o amigo" no card: alguém diferente do avatar do jogador. */
export const friendAvatarFor = (mine: string) =>
  mine === "latina" ? "garoto" : "latina";

/**
 * Card "Duelo online" no topo da tela inicial: é a função que o jogo quer popularizar, então fica em
 * destaque. O avatar do jogador e o de um adversário frente a frente com o escudo VS, o botão grande
 * "Jogar agora" (abre direto a busca de oponente, que chama a IA se ninguém aparecer) e "Convidar
 * amigo" (o lobby, onde se cria a sala e se manda o código). Com duelo por turnos esperando a jogada
 * dele, o botão vira "Jogar (N)" e leva à lista de partidas.
 */
export function DuelCard({ avatar }: { avatar: string }) {
  const me = avatarOf(avatar).id;
  const frame = usePlayer((s) => currentFrame(s.player));
  const friend = friendAvatarFor(me);
  const myTurns = useMatchItems().filter((m) => m.state === "yourTurn").length;
  return (
    <section className="duel-card" aria-label={t.duelTitle}>
      <span className="duel-card-faces" aria-hidden="true">
        <span className={`duel-face-wrap ${frame ? "has-frame" : ""}`}>
          <img
            className="duel-face me"
            src={`/art/opponents/${me}-happy.webp`}
            alt=""
            draggable={false}
          />
          {frame && <FrameArt frame={frame} />}
        </span>
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
      <span className="duel-card-text">
        <span className="duel-card-title">
          <strong>{t.duelTitle}</strong>
          <span className="duel-card-badge">{t.duelBadge}</span>
        </span>
        {myTurns ? (
          <small className="duel-card-turn">
            {onlineT.yourTurnCount(myTurns)}
          </small>
        ) : (
          <small>{t.duelSub}</small>
        )}
      </span>
      <span className="duel-card-actions">
        <Link
          className="duel-card-cta"
          to={myTurns ? "/online" : "/online/procurar"}
          aria-label={
            myTurns
              ? `${t.duelTitle}: ${onlineT.yourTurnCount(myTurns)}`
              : t.duelPlayLabel
          }
          onClick={() =>
            track("home_duel_card", { action: myTurns ? "turns" : "play" })
          }
        >
          <Play size={20} fill="currentColor" aria-hidden="true" />{" "}
          {myTurns ? `${onlineT.play} (${myTurns})` : t.duelPlay}
        </Link>
        <Link
          className="duel-card-invite"
          to="/online"
          aria-label={t.duelInvite}
          onClick={() => track("home_duel_card", { action: "invite" })}
        >
          <UserPlus size={18} aria-hidden="true" />
          {/* Em telas estreitas fica só o ícone (o nome segue no aria-label). */}
          <span className="duel-card-invite-text">{t.duelInvite}</span>
        </Link>
      </span>
    </section>
  );
}
