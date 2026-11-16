import { assetNow, useAsset } from "../content/assets";
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
  // Rival baixado do servidor: até o rosto chegar, um círculo neutro no lugar.
  const src = useAsset(opponentFace(opponent.id, mood), PLACEHOLDER_FACE);
  return (
    <img
      className={`opponent-avatar ${className}`}
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      // Humor sem arte (ou arquivo ausente): volta ao rosto neutro.
      onError={(e) => {
        const fallback =
          assetNow(opponentFace(opponent.id, "neutral")) ?? PLACEHOLDER_FACE;
        if (!e.currentTarget.src.endsWith(fallback))
          e.currentTarget.src = fallback;
      }}
    />
  );
}

/** Rosto provisório (círculo claro) enquanto a arte de um rival baixado não chega. */
export const PLACEHOLDER_FACE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#e3ecf8"/><circle cx="32" cy="26" r="11" fill="#c3d3ea"/><path d="M12 54c4-11 12-16 20-16s16 5 20 16" fill="#c3d3ea"/></svg>',
  );
