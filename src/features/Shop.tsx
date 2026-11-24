import { useState } from "react";
import { Package } from "lucide-react";
import { CoinIcon } from "../components/CoinIcon";
import { buyItem, itemCount, SHOP_ITEMS, type ItemId } from "../game/shop";
import { usePlayer } from "../stores/player";
import { playSfx } from "../services/sound";
import { track } from "../services/telemetry";
import { shopT as t } from "../i18n/screens";

/** Ícones da loja (gerados no ChatGPT a partir do conceito da tela; public/art/loja). */
export const SHOP_ART: Record<ItemId, string> = {
  curinga: "/art/loja/curinga.webp",
  vogal: "/art/loja/vogais.webp",
};

/** Arte do item: a peça dourada do curinga ou as vogais em peças azuis. */
function ItemArt({ id }: { id: ItemId }) {
  return (
    <span className={`shop-art ${id}`} aria-hidden="true">
      <img src={SHOP_ART[id]} alt="" draggable={false} />
    </span>
  );
}

/** Loja: itens comprados com moedas e usados na partida (botão "Itens", na sua vez). */
export function Shop() {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const [note, setNote] = useState("");
  const buy = (id: ItemId) => {
    const item = SHOP_ITEMS.find((i) => i.id === id)!;
    if (player.coins < item.preco) return;
    update((p) => buyItem(p, id));
    playSfx(player.sound, "buy");
    track("item_bought", { item: id, price: item.preco });
    setNote(t.bought(item.nome));
  };
  return (
    <>
      <div className="page-heading shop-heading">
        <h1>{t.title}</h1>
      </div>
      <p className="shop-balance">
        <img
          className="shop-balance-coins"
          src="/art/loja/moedas.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span>
          {t.balance}
          <b>
            {player.coins} <small>{t.coins}</small>
          </b>
        </span>
      </p>
      <ul className="shop-list" aria-label={t.forSale}>
        {SHOP_ITEMS.map((item) => {
          const owned = itemCount(player, item.id);
          return (
            <li key={item.id} className={`shop-item shop-${item.id}`}>
              <ItemArt id={item.id} />
              <div className="shop-item-text">
                <h2>{item.nome}</h2>
                <p>{item.resumo}</p>
                {item.usos > 1 && (
                  <span className="shop-badge">{t.usesPerBuy(item.usos)}</span>
                )}
                <small>
                  <Package size={14} aria-hidden="true" /> {t.youHave(owned)}
                </small>
              </div>
              <button
                type="button"
                className="button primary shop-buy"
                disabled={player.coins < item.preco}
                aria-label={t.buyLabel(item.nome, item.preco)}
                onClick={() => buy(item.id)}
              >
                {t.buy}
                <span>
                  <CoinIcon size={20} /> {item.preco}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="shop-tip" role="status">
        <img
          className="shop-tip-bag"
          src="/art/loja/mochila.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span>
          {note || (
            <>
              {t.tipBefore}
              <b>{t.tipItems}</b>
              {t.tipAfter}
            </>
          )}
        </span>
      </p>
    </>
  );
}
