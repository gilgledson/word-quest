import {
  opponentFace,
  type Mood,
  type OpponentProfile,
} from "../game/opponents";

/** Rosto do oponente (arte do Leonardo.ai); o nome fica no texto ao redor, então a imagem é decorativa. */
export function OpponentAvatar({
  opponent,
  size = 28,
  mood = "neutral",
  className = "",
}: {
  opponent: Pick<OpponentProfile, "id">;
  size?: number;
  mood?: Mood;
  className?: string;
}) {
  return (
    <img
      className={`opponent-avatar ${className}`}
      src={opponentFace(opponent.id, mood)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      // Humor sem arte (ou arquivo ausente): volta ao rosto neutro.
      onError={(e) => {
        const fallback = opponentFace(opponent.id, "neutral");
        if (!e.currentTarget.src.endsWith(fallback))
          e.currentTarget.src = fallback;
      }}
    />
  );
}
