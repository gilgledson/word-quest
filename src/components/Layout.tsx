import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { Scenery } from "./Scenery";
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
} from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../stores/player";
import { CoinIcon } from "./CoinIcon";
export function Wallet() {
  const p = usePlayer((s) => s.player);
  return (
    <div className="wallet">
      <span>
        <Star size={17} fill="currentColor" />
        {Object.values(p.stars).reduce((a, b) => a + b, 0)}
      </span>
      <span>
        <CoinIcon />
        {p.coins}
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
      aria-label={music ? "Desligar música" : "Ligar música"}
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
  const home = pathname === "/";
  const playing = pathname.startsWith("/play/");
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
            src="/art/wordquest-logo-v1.webp"
            alt="WordQuest — A Jornada das Palavras"
            width="210"
            height="70"
          />
        </Link>
        {map && (
          <Link
            className="map-back"
            to="/"
            aria-label="Voltar ao menu principal"
          >
            <ArrowLeft />
          </Link>
        )}
        <Wallet />
        {!playing && <MusicButton />}
        {playing && (
          <Link
            className="settings-button"
            to="/profile"
            aria-label="Configurações"
          >
            <Settings />
          </Link>
        )}
      </header>
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
            <span>Uma palavra. Um novo caminho.</span>
            <span>Feito para explorar, no seu ritmo.</span>
          </footer>
          <nav className="bottom-nav" aria-label="Navegação principal">
            <NavLink to="/" end>
              <Compass />
              Aventura
            </NavLink>
            <NavLink to="/casual">
              <Shapes />
              Casual
            </NavLink>
            <NavLink to="/daily">
              <CalendarDays />
              Diário
            </NavLink>
            <NavLink to="/profile">
              <UserRound />
              Perfil
            </NavLink>
          </nav>
        </>
      )}
    </div>
  );
}
