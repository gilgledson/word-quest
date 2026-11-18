import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { isPlayPath } from "../game/routes";
import { Scenery } from "./Scenery";
import { ResumeMatchToast } from "./ResumeMatchToast";
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
          aria-label={`${p.coins} moedas: abrir a loja`}
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
  const toClaim = usePlayer((s) => claimableCount(s.player));
  // Duelo ao vivo que ficou para trás (saiu sem querer): um atalho em todas as telas.
  const activeOnline = usePlayer((s) => s.player.activeOnline);
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
      <ResumeMatchToast code={activeOnline} visible={!playing && !map} />
      {/* Só na tela inicial (nas outras cobriria o título); o aviso de partida em andamento ocupa
          o mesmo lugar, então um de cada vez. */}
      <WebAppBar visible={home && !activeOnline} />
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
              {toClaim > 0 && (
                <span
                  className="nav-badge"
                  aria-label={`${toClaim} ${toClaim === 1 ? "conquista" : "conquistas"} para resgatar`}
                >
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
