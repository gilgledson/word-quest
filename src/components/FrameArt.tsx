import { FRAME_HOLE, frameArt, type FrameId } from "../game/frames";
import type { OpponentProfile } from "../game/opponents";
import { OpponentAvatar } from "./OpponentAvatar";

/**
 * A moldura de perfil por cima de um avatar redondo. Vai dentro do elemento do avatar (com a classe
 * `has-frame`, que tem `position: relative` e o tamanho do rosto): a arte é maior que ele, na
 * proporção do furo de cada moldura, e o furo, um pouco menor que o rosto, cobre a borda dele.
 */
export function FrameArt({ frame }: { frame: FrameId }) {
  const side = `${((100 / FRAME_HOLE[frame]) * 0.94).toFixed(1)}%`;
  return (
    <img
      className="frame-art"
      src={frameArt(frame)}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: side, height: side }}
    />
  );
}

/** Avatar redondo de `size` px com a moldura em uso (ou sem nenhuma). */
export function FramedAvatar({
  opponent,
  size,
  frame,
  className = "",
}: {
  opponent: Pick<OpponentProfile, "id">;
  size: number;
  frame?: FrameId;
  className?: string;
}) {
  return (
    <span
      className={`framed-avatar ${frame ? "has-frame" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <OpponentAvatar opponent={opponent} size={size} />
      {frame && <FrameArt frame={frame} />}
    </span>
  );
}
