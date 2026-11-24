import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ChevronRight, Lock, X } from "lucide-react";
import { SHOP_ITEMS, VOWELS, type ItemId } from "../../game/shop";
import { MT } from "../../i18n/match";

interface Props {
  /** Usos de cada item no inventário. */
  counts: Record<ItemId, number>;
  /** Vogais que podem vir agora (a grade ainda precisa e há na reserva). */
  vowels: string[];
  /** O curinga cabe agora (há como abrir espaço no banco). */
  canJoker: boolean;
  animated: boolean;
  /** Mostra o atalho para a Loja (fora do duelo ao vivo, onde sair da tela tem custo). */
  shopLink?: boolean;
  onJoker: () => void;
  onVowel: (letter: string) => void;
  onCancel: () => void;
}
const uses = (n: number) => MT.uses(n);
/**
 * "Seus itens": folha que sobe de baixo na vez do jogador, com a grade e o banco ainda à vista.
 * Curinga (vai para o banco) e vogais (só as que a grade ainda precisa ficam azuis).
 */
export function ItemsDialog({
  counts,
  vowels,
  canJoker,
  animated,
  shopLink = true,
  onJoker,
  onVowel,
  onCancel,
}: Props) {
  const [joker, kit] = SHOP_ITEMS;
  return (
    <motion.div
      className="items-backdrop"
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <motion.div
        className="items-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={MT.useItem}
        initial={animated ? { y: "100%" } : false}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
      >
        <span className="items-handle" aria-hidden="true" />
        <div className="items-head">
          <h2>{MT.yourItems}</h2>
          <button type="button" aria-label={MT.close} onClick={onCancel}>
            <X />
          </button>
        </div>
        <section className="items-row" aria-label={joker.nome}>
          <img src="/art/loja/curinga.webp" alt="" aria-hidden="true" />
          <div>
            <h3>
              {joker.nome} <span>{uses(counts.curinga)}</span>
            </h3>
            <p>{joker.resumo}</p>
          </div>
          <button
            type="button"
            className="button primary"
            aria-label={MT.useJoker}
            disabled={!counts.curinga || !canJoker}
            onClick={onJoker}
          >
            {MT.use}
          </button>
        </section>
        <section className="items-row vowels" aria-label={kit.nome}>
          <img src="/art/loja/vogais.webp" alt="" aria-hidden="true" />
          <div>
            <h3>
              {kit.nome} <span>{uses(counts.vogal)}</span>
            </h3>
            <p>{kit.resumo}</p>
          </div>
          <div className="items-vowels">
            {VOWELS.map((v) => {
              const ok = counts.vogal > 0 && vowels.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  className={ok ? "" : "locked"}
                  aria-label={MT.takeVowel(v)}
                  disabled={!ok}
                  onClick={() => onVowel(v)}
                >
                  {v}
                  {!ok && <Lock aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <small className="items-legend">
            {counts.vogal > 0 && !vowels.length
              ? MT.noVowelsNeeded
              : MT.vowelLegend}
          </small>
        </section>
        {shopLink && (
          <Link className="items-shop" to="/loja">
            <img src="/art/loja/mochila.webp" alt="" aria-hidden="true" />
            {MT.goShop}
            <ChevronRight aria-hidden="true" />
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}
