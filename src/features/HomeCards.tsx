import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, ShoppingCart } from "lucide-react";
import { RewardedButton, rewardedMessage } from "../components/RewardedButton";
import { today } from "../data/catalog";
import { REWARDED, videosLeft } from "../game/rewarded";
import { canOffer, startRewarded, useRewarded } from "../services/rewardedAds";
import { playSfx } from "../services/sound";
import { track } from "../services/telemetry";
import { usePlayer } from "../stores/player";
import { homeT as t, rewardedT } from "../i18n/screens";

/**
 * Card "Ganhe moedas grátis" da tela inicial: a claquete com moedas, o convite e o botão verde
 * "Assistir". Só aparece quando há vídeo carregado e o limite do dia ainda não acabou (some junto
 * com o botão); depois do vídeo, a linha de baixo diz o que aconteceu.
 */
export function HomeVideoCard() {
  const sound = usePlayer((s) => s.player.sound);
  const left = usePlayer((s) => videosLeft(s.player.rewarded, today()));
  const { ready, busy } = useRewarded();
  const [note, setNote] = useState("");
  // Carrega o vídeo ao abrir a tela inicial (o card só aparece quando ele estiver pronto).
  useEffect(() => void startRewarded(), []);
  if (!busy && !canOffer(ready, left)) return null;
  return (
    <section className="home-video-card" aria-label={t.videoTitle}>
      {/* Arte gerada no ChatGPT (claquete com moedas; public/art/loja). */}
      <img
        className="home-video-art"
        src="/art/loja/video-moedas.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="home-card-text">
        <strong>{t.videoTitle}</strong>
        <small role="status">{note || t.videoSub}</small>
      </span>
      <RewardedButton
        place="home"
        coins={REWARDED.coins}
        label={t.videoWatch}
        busyLabel="…"
        ariaLabel={rewardedT.watch(REWARDED.coins)}
        className="home-video-watch"
        icon={<Play size={20} fill="currentColor" aria-hidden="true" />}
        onResult={(o, coins) => {
          // No card cabe só o curto ("+30 moedas!"); os avisos de falha seguem os da loja.
          setNote(o.earned ? t.videoEarned(coins) : rewardedMessage(o, coins));
          if (o.earned) playSfx(sound, "buy");
        }}
      />
    </section>
  );
}

/**
 * Card "Loja" da tela inicial: a mochila de itens, o nome, uma vitrine com moedas, vogais e o
 * curinga, e "Abrir loja". O card inteiro leva à loja (/loja).
 */
export function HomeShopCard() {
  return (
    <Link
      className="home-shop-card"
      to="/loja"
      aria-label={t.shopLabel}
      onClick={() => track("home_shop_card")}
    >
      <img
        className="home-shop-art"
        src="/art/loja/mochila.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="home-card-text">
        <strong>{t.shopTitle}</strong>
        <small>{t.shopSub}</small>
      </span>
      <span className="home-shop-window" aria-hidden="true">
        <img src="/art/loja/moedas.webp" alt="" draggable={false} />
        <img src="/art/loja/vogais.webp" alt="" draggable={false} />
        <img src="/art/loja/curinga.webp" alt="" draggable={false} />
      </span>
      <span className="home-shop-open" aria-hidden="true">
        <ShoppingCart size={18} /> {t.shopOpen}
      </span>
    </Link>
  );
}
