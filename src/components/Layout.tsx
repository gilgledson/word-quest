import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { isPlayPath } from "../game/routes";
import { Scenery } from "./Scenery";
import { ResumeMatchToast } from "./ResumeMatchToast";
import { MatchesWatcher, useMatchItems } from "../features/myMatches";
import { rivalProfile } from "../game/online";
import { onlineText as onlineT } from "../i18n/online";
import {
  endOnlineMatch,
  useActiveOnlineCheck,
} from "../features/onlineCleanup";
import { WebAppBar } from "./WebAppBar";
import {
  Compass,
  Shapes,
  CalendarDays,
  UserRound,
  Star,
  Settings,
  ArrowLeft,
  Volume2,
  VolumeX,
  Plus,
} from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../stores/player";
import { CoinIcon } from "./CoinIcon";
import { claimableCount } from "../game/achievements";
import { shellT as t } from "../i18n/screens";
import { logoSrc } from "../i18n";
export function Wallet() {
  const p = usePlayer((s) => s.player);
  return (
    <div className="wallet">
      <span>
        <Star size={17} fill="currentColor" />
        {Object.values(p.stars).reduce((a, b) => a + b, 0)}
      </span>
      <span className="wallet-coins">
        <CoinIcon />
        {p.coins}
        <Link
          className="wallet-shop"
          to="/loja"
          aria-label={t.walletShop(p.coins)}
        >
          <Plus aria-hidden="true" />
        </Link>
      </span>
    </div>
  );
}
/** Liga e desliga a música de fundo; fica no topo das telas fora da partida. */
export function MusicButton() {
  const music = usePlayer((s) => s.player.music);
  const update = usePlayer((s) => s.update);
  return (
    <button
      className="music-button"
      aria-label={music ? t.musicOff : t.musicOn}
      aria-pressed={music}
      onClick={() => update((p) => ({ ...p, music: !p.music }))}
    >
      {music ? <Volume2 /> : <VolumeX />}
    </button>
  );
}
export function Layout() {
  const error = usePlayer((s) => s.error);
  const { pathname } = useLocation();
  const enabled = usePlayer((s) => s.player.animations);
  const toClaim = usePlayer((s) => claimableCount(s.player));
  // Duelo ao vivo que ficou para trás (saiu sem querer): um atalho em todas as telas.
  const activeOnline = usePlayer((s) => s.player.activeOnline);
  // Sala que sumiu, acabou ou ficou parada: o aviso sai sozinho.
  useActiveOnlineCheck(
    activeOnline,
    !!activeOnline && pathname === `/online/${activeOnline}`,
  );
  // Duelo por turnos em que é a vez do jogador: "Sua vez!" com atalho, fora das telas do duelo
  // (lá a lista "Minhas partidas" já mostra, e o aviso cobriria a sala e a procura).
  const turns = useMatchItems();
  const myTurn = pathname.startsWith("/online")
    ? undefined
    : turns.find((m) => m.state === "yourTurn");
  const home = pathname === "/";
  const playing = isPlayPath(pathname);
  const map = pathname.startsWith("/map");
  const secondary = !home && !playing && !map;
  return (
    <div
      className={`app ${home ? "app-home" : ""} ${playing ? "app-playing" : ""} ${map ? "app-map" : ""} ${secondary ? "app-secondary" : ""}`}
    >
      {(home || playing || secondary) && (
        <div className="home-landscape" aria-hidden="true">
          <Scenery />
        </div>
      )}
      <header>
        <Link className="brand" to="/">
          <span className="game-art art-book" aria-hidden="true" />
          <img
            className="brand-wordmark"
            src={logoSrc()}
            alt={t.logoAlt}
            width="210"
            height="70"
          />
        </Link>
        {map && (
          <Link className="map-back" to="/" aria-label={t.backToMenu}>
            <ArrowLeft />
          </Link>
        )}
        <Wallet />
        {!playing && <MusicButton />}
        {playing && (
          <Link
            className="settings-button"
            to="/profile"
            aria-label={t.settings}
          >
            <Settings />
          </Link>
        )}
      </header>
      <MatchesWatcher />
      <ResumeMatchToast
        code={activeOnline}
        visible={!playing && !map}
        onEnd={endOnlineMatch}
      />
      <ResumeMatchToast
        id="sua-vez"
        code={myTurn?.code}
        visible={!playing && !map}
        title={onlineT.yourTurn}
        detail={onlineT.yourTurnVs(rivalProfile(myTurn?.rival).name)}
        action={onlineT.play}
      />
      {/* Só na tela inicial (nas outras cobriria o título); o aviso de partida em andamento ocupa
          o mesmo lugar, então um de cada vez. */}
      <WebAppBar visible={home && !activeOnline && !myTurn} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <motion.main
        key={pathname}
        // Transição curta entre telas; no mapa em tela cheia não há movimento (evita deslocar o cenário).
        initial={enabled && !map ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
      {!playing && !map && (
        <>
          <footer>
            <span>{t.footer1}</span>
            <span>{t.footer2}</span>
          </footer>
          <nav className="bottom-nav" aria-label={t.mainNav}>
            <NavLink to="/" end>
              <Compass />
              {t.navAdventure}
            </NavLink>
            <NavLink to="/casual">
              <Shapes />
              {t.navCasual}
            </NavLink>
            <NavLink to="/daily">
              <CalendarDays />
              {t.navDaily}
            </NavLink>
            <NavLink to="/profile">
              <UserRound />
              {t.navProfile}
              {toClaim > 0 && (
                <span className="nav-badge" aria-label={t.toClaim(toClaim)}>
                  {toClaim}
                </span>
              )}
            </NavLink>
          </nav>
        </>
      )}
    </div>
  );
}
