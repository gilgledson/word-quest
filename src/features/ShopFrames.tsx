import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { CoinIcon } from "../components/CoinIcon";
import { FramedAvatar } from "../components/FrameArt";
import { OpponentAvatar } from "../components/OpponentAvatar";
import {
  AVATAR_PRICES,
  avatarOf,
  buyAvatar,
  INDIA_AVATARS,
  ownsAvatar,
  PREMIUM_AVATARS,
  type PlayerAvatar,
} from "../game/avatars";
import {
  buyFrame,
  currentFrame,
  CLASSIC_FRAMES,
  FRAME_PRICES,
  RUSTIC_FRAMES,
  ownsFrame,
  wearFrame,
  type FrameId,
} from "../game/frames";
import { opponentById } from "../game/opponents";
import { deviceCountry, isIndia } from "../game/region";
import { playSfx } from "../services/sound";
import { track } from "../services/telemetry";
import { usePlayer } from "../stores/player";
import { framesT as t } from "../i18n/screens";

/**
 * Abas "Avatares" e "Molduras" da loja (referência: docs/referencias/loja/loja-abas-chatgpt.png).
 * Cada aba tem a prévia do duelo no topo e a grade de 3 colunas (as molduras com filtros em chips); tocar num card
 * mostra o avatar ou a moldura na prévia, e comprar já passa a usar.
 */

/** Rival que aparece na prévia do duelo (o primeiro da Aventura). */
const PREVIEW_RIVAL = "bolota";

/** Prévia compacta do duelo: o jogador (com moldura) contra o primeiro rival da Aventura. */
function DuelPreview({ face, frame }: { face: string; frame?: FrameId }) {
  const name = usePlayer((s) => s.player.name);
  const rival = opponentById(PREVIEW_RIVAL);
  return (
    <section className="frames-preview" aria-label={t.previewTitle}>
      <h2>{t.previewTitle}</h2>
      <div className="frames-preview-duel" aria-hidden="true">
        <span className="frames-preview-side">
          <FramedAvatar opponent={avatarOf(face)} size={50} frame={frame} />
          <b>{name || t.you}</b>
        </span>
        <span className="frames-preview-vs">VS</span>
        <span className="frames-preview-side rival">
          {rival && <OpponentAvatar opponent={rival} size={50} />}
          <b>{rival?.name}</b>
        </span>
      </div>
    </section>
  );
}

/** Chips de filtro (um só marcado). */
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="shop-chips" role="group" aria-label={t.filterLabel}>
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={value === id ? "selected" : ""}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Card da grade: arte (toque = prévia), nome, preço e Comprar / Usar / Em uso. */
function ShopCard({
  name,
  art,
  price,
  owned,
  inUse,
  previewing,
  coins,
  buyLabel,
  useLabel,
  onPreview,
  onBuy,
  onUse,
}: {
  name: string;
  art: ReactNode;
  price: number;
  owned: boolean;
  inUse: boolean;
  previewing: boolean;
  coins: number;
  buyLabel: string;
  useLabel: string;
  onPreview: () => void;
  onBuy: () => void;
  onUse: () => void;
}) {
  const short = price - coins;
  return (
    <li
      className={`frames-item ${inUse ? "in-use" : ""} ${previewing ? "previewing" : ""}`}
    >
      <button
        type="button"
        className="frames-item-art"
        aria-label={name}
        aria-pressed={previewing}
        onClick={onPreview}
      >
        {art}
      </button>
      <span className="frames-item-text">
        <strong>{name}</strong>
        {!owned && (
          <span className="frames-price">
            <CoinIcon size={14} /> {price}
          </span>
        )}
      </span>
      {inUse ? (
        <span className="frames-in-use">
          <Check size={14} aria-hidden="true" /> {t.inUse}
        </span>
      ) : owned ? (
        <button
          type="button"
          className="button frames-use"
          aria-label={useLabel}
          onClick={onUse}
        >
          {t.use}
        </button>
      ) : (
        <button
          type="button"
          className="button primary frames-buy"
          aria-label={buyLabel}
          disabled={short > 0}
          onClick={onBuy}
        >
          {short > 0 ? t.missing(short) : t.buy}
        </button>
      )}
    </li>
  );
}

/**
 * Ordem da grade de avatares: do mais barato ao mais caro (escolha do dono, 27/11/2026: sem
 * categorias). Para quem está na Índia, os indianos vêm primeiro, também por preço.
 */
export function avatarShopOrder(inIndia: boolean): PlayerAvatar[] {
  const byPrice = (list: PlayerAvatar[]) =>
    [...list].sort((a, b) => AVATAR_PRICES[a.id] - AVATAR_PRICES[b.id]);
  return inIndia
    ? [...byPrice(INDIA_AVATARS), ...byPrice(PREMIUM_AVATARS)]
    : byPrice([...PREMIUM_AVATARS, ...INDIA_AVATARS]);
}

/** Aba "Avatares": os premium numa grade só, do mais barato ao mais caro. */
export function ShopAvatars({ onNote }: { onNote: (text: string) => void }) {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const [previewFace, setPreviewFace] = useState(player.avatar);
  const [list] = useState(() => avatarShopOrder(isIndia()));
  const buy = (id: string) => {
    const price = AVATAR_PRICES[id];
    if (!price || player.coins < price || ownsAvatar(player, id)) return;
    update((p) => buyAvatar(p, id));
    playSfx(player.sound, "buy");
    track("avatar_bought", {
      avatar: id,
      price,
      country: deviceCountry() ?? "unknown",
    });
    setPreviewFace(id);
    onNote(t.avatarBought(avatarOf(id).name));
  };
  const wear = (id: string) => {
    update((p) =>
      ownsAvatar(p, id) ? { ...p, avatar: id, profileSet: true } : p,
    );
    track("avatar_used", { avatar: id });
    setPreviewFace(id);
    onNote(t.avatarUsing(avatarOf(id).name));
  };
  return (
    <>
      <DuelPreview face={previewFace} frame={currentFrame(player)} />
      <ul className="frames-list avatars-list" aria-label={t.avatarsTitle}>
        {list.map((a) => (
          <ShopCard
            key={a.id}
            name={a.name}
            art={<FramedAvatar opponent={a} size={64} />}
            price={AVATAR_PRICES[a.id]}
            owned={ownsAvatar(player, a.id)}
            inUse={player.avatar === a.id}
            previewing={previewFace === a.id}
            coins={player.coins}
            buyLabel={t.avatarBuyLabel(a.name, AVATAR_PRICES[a.id])}
            useLabel={t.avatarUseLabel(a.name)}
            onPreview={() => setPreviewFace(a.id)}
            onBuy={() => buy(a.id)}
            onUse={() => wear(a.id)}
          />
        ))}
      </ul>
    </>
  );
}

type FrameFilter = "todas" | "rusticas" | "classicas";

/** Aba "Molduras": as 16 molduras com o avatar do jogador dentro. */
export function ShopFrames({ onNote }: { onNote: (text: string) => void }) {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const equipped = currentFrame(player);
  const [preview, setPreview] = useState<FrameId | undefined>(equipped);
  const [filter, setFilter] = useState<FrameFilter>("todas");
  const me = avatarOf(player.avatar);
  const labels = {
    todas: t.allFrames,
    rusticas: t.rustic,
    classicas: t.classic,
  };
  const ids: readonly FrameId[] =
    filter === "rusticas"
      ? RUSTIC_FRAMES
      : filter === "classicas"
        ? CLASSIC_FRAMES
        : [...RUSTIC_FRAMES, ...CLASSIC_FRAMES];
  const buy = (id: FrameId) => {
    const price = FRAME_PRICES[id];
    if (player.coins < price || ownsFrame(player, id)) return;
    update((p) => buyFrame(p, id));
    playSfx(player.sound, "buy");
    track("frame_bought", { frame: id, price });
    setPreview(id);
    onNote(t.bought(t.names[id]));
  };
  const use = (id: FrameId | undefined) => {
    update((p) => wearFrame(p, id));
    track("frame_used", { frame: id ?? "none" });
    setPreview(id);
    onNote(id ? t.using(t.names[id]) : t.removed);
  };
  return (
    <>
      <DuelPreview face={player.avatar} frame={preview} />
      <Chips
        options={(["todas", "rusticas", "classicas"] as const).map((id) => [
          id,
          labels[id],
        ])}
        value={filter}
        onChange={setFilter}
      />
      <ul
        className="frames-list"
        aria-label={filter === "todas" ? t.listTitle : labels[filter]}
      >
        {ids.map((id) => (
          <ShopCard
            key={id}
            name={t.names[id]}
            art={<FramedAvatar opponent={me} size={40} frame={id} />}
            price={FRAME_PRICES[id]}
            owned={ownsFrame(player, id)}
            inUse={equipped === id}
            previewing={preview === id}
            coins={player.coins}
            buyLabel={t.buyLabel(t.names[id], FRAME_PRICES[id])}
            useLabel={t.useLabel(t.names[id])}
            onPreview={() => setPreview(id)}
            onBuy={() => buy(id)}
            onUse={() => use(id)}
          />
        ))}
      </ul>
      {equipped && (
        <button
          type="button"
          className="frames-remove"
          onClick={() => use(undefined)}
        >
          {t.remove}
        </button>
      )}
    </>
  );
}
