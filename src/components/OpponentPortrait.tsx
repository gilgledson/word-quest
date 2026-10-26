import { type Mood, type OpponentProfile } from "../game/opponents";
import { OpponentAvatar } from "./OpponentAvatar";

const BUBBLE: Partial<Record<Mood, string>> = {
  happy: "✨",
  angry: "💢",
  sad: "💧",
  surprised: "❗",
  thinking: "…",
};

/**
 * Rosto do oponente com a expressão do momento e uma animação própria por humor (só transform e
 * opacity). `moodKey` muda a cada reação nova para a animação tocar de novo.
 */
export function OpponentPortrait({
  opponent,
  mood,
  moodKey = 0,
  size = 44,
  animate = true,
}: {
  opponent: Pick<OpponentProfile, "id">;
  mood: Mood;
  moodKey?: number;
  size?: number;
  animate?: boolean;
}) {
  return (
    <span
      className={`opponent-portrait mood-${mood} ${animate ? "animated" : ""}`}
      data-mood={mood}
      data-testid="opponent-portrait"
      style={{ width: size, height: size }}
    >
      <span key={moodKey} className="portrait-face">
        <OpponentAvatar opponent={opponent} size={size} mood={mood} />
      </span>
      {animate && BUBBLE[mood] && (
        <span
          key={`b${moodKey}`}
          className="portrait-bubble"
          aria-hidden="true"
        >
          {BUBBLE[mood]}
        </span>
      )}
    </span>
  );
}
