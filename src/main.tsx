import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { followLinks } from "./services/links";
import { followReminderTaps, syncReminders } from "./services/reminders";
import { currentStreak } from "./game/dailyShare";
import { today } from "./data/catalog";
import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StudioSplash } from "./components/StudioSplash";
import {
  Home,
  Campaign,
  WorldMap,
  Casual,
  Daily,
  Profile,
} from "./features/pages";
import { Credits } from "./features/Credits";
import { Shop } from "./features/Shop";
import { CasualSetup } from "./features/CasualSetup";
// A partida (motor, animações, confete) só é baixada ao abrir uma fase.
// O duelo ao vivo (salas e servidor) só é baixado por quem abre o modo online.
const OnlineLobby = lazy(() =>
  import("./features/OnlinePage").then((m) => ({ default: m.OnlineLobby })),
);
const OnlineMatch = lazy(() =>
  import("./features/OnlinePage").then((m) => ({
    default: m.OnlineMatchRoute,
  })),
);
const OnlineSetup = lazy(() =>
  import("./features/OnlinePage").then((m) => ({
    default: m.OnlineSetupRoute,
  })),
);
const PuzzlePage = lazy(() =>
  import("./features/PuzzlePage").then((m) => ({ default: m.PuzzlePage })),
);
import { usePlayer } from "./stores/player";
import { lang, setLang } from "./i18n";
import { shellT } from "./i18n/screens";
import { refreshContent, startContent } from "./content/content";
import {
  bundleVersion,
  checkLiveUpdate,
  confirmBundle,
} from "./services/liveUpdate";
import "./app/styles.css";
import "./animations/animations.css";
// Depois das animações: refina a janela de resultado definida lá.
import "./app/styles/result.css";
import "./app/styles/result-sheet.css";
import "./animations/mood.css";
import { unlockAudio } from "./services/sound";
import { keepScreenOn } from "./services/wakeLock";
import { resumeMusic } from "./services/music";
import { MusicController } from "./components/MusicController";
import { Toasts } from "./components/ResumeMatchToast";
import { PlayGamesSync } from "./features/PlayGamesCard";
import {
  installErrorReporting,
  trackAppReady,
  trackScreen,
} from "./services/telemetry";
// O primeiro toque em qualquer lugar libera o áudio (política de autoplay do navegador e do WebView).
for (const type of ["pointerdown", "touchend", "click", "keydown"])
  window.addEventListener(
    type,
    () => {
      unlockAudio();
      resumeMusic();
    },
    { once: false, passive: true },
  );
keepScreenOn();
/** Registra cada tela aberta na medição de uso (só no app Android). Não desenha nada. */
function ScreenTracker() {
  const { pathname } = useLocation();
  useEffect(() => trackScreen(pathname), [pathname]);
  return null;
}
function GameRoute() {
  const { pathname, search } = useLocation();
  return (
    <Suspense fallback={<div className="loading">{shellT.openingLevel}</div>}>
      <PuzzlePage key={pathname + search} />
    </Suspense>
  );
}
function OnlineRoute({ match, setup }: { match?: boolean; setup?: boolean }) {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<div className="loading">{shellT.openingDuel}</div>}>
      {setup ? (
        <OnlineSetup />
      ) : match ? (
        <OnlineMatch key={pathname} />
      ) : (
        <OnlineLobby />
      )}
    </Suspense>
  );
}
/** Uma tela que quebra não derruba as outras: o erro some quando o jogador navega. */
/** Links do site (convites) levam à tela certa: ao abrir o app, com ele aberto e após instalar. */
function LinkFollower() {
  const navigate = useNavigate();
  useEffect(() => followLinks((route) => navigate(route)), [navigate]);
  // Tocar no lembrete diário também abre o jogo na tela certa.
  useEffect(() => followReminderTaps((route) => navigate(route)), [navigate]);
  return null;
}
/** Lembretes do dia refeitos quando muda o que eles anunciam (recompensa, diário, opção). */
function ReminderSync() {
  const reminders = usePlayer((s) => s.player.reminders);
  const loginReward = usePlayer((s) => s.player.loginReward);
  const daily = usePlayer((s) => s.player.daily);
  useEffect(() => {
    const date = today();
    void syncReminders(
      { reminders, loginReward, daily, streak: currentStreak(daily, date) },
      date,
    );
  }, [reminders, loginReward, daily]);
  return null;
}
function Guarded({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
function App() {
  const { ready, hydrate, player } = usePlayer();
  useEffect(() => {
    // O conteúdo baixado (fases, rivais, mapas) entra antes do progresso e da primeira tela.
    void startContent().then(hydrate);
  }, [hydrate]);
  useEffect(() => {
    if (!ready) return;
    // O app abriu e carregou o progresso: esta versão do pacote está boa (senão o plugin a desfaz).
    void confirmBundle();
    trackAppReady(bundleVersion());
    // Novidades do servidor (conteúdo e versão do app) ficam para a próxima abertura; a
    // conferência espera o app assentar.
    const t = window.setTimeout(() => {
      void refreshContent(usePlayer.getState().player);
      void checkLiveUpdate();
    }, 4000);
    return () => window.clearTimeout(t);
  }, [ready]);
  const loading = (
    <div className="loading">
      <img className="loading-icon" src="/icon-192.png" alt="" />
      {shellT.preparing}
    </div>
  );
  return (
    <>
      <StudioSplash ready={ready} />
      {ready ? (
        <MotionConfig reducedMotion={player.animations ? "user" : "always"}>
          <BrowserRouter>
            <Toasts />
            <MusicController />
            <PlayGamesSync />
            <ScreenTracker />
            <LinkFollower />
            <ReminderSync />
            <Guarded>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="map" element={<Campaign />} />
                  <Route path="map/:world" element={<WorldMap />} />
                  <Route path="casual" element={<Casual />} />
                  <Route path="casual/nova" element={<CasualSetup />} />
                  <Route path="daily" element={<Daily />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="credits" element={<Credits />} />
                  <Route path="loja" element={<Shop />} />
                  <Route path="play/:id" element={<GameRoute />} />
                  <Route path="online" element={<OnlineRoute />} />
                  <Route path="online/nova" element={<OnlineRoute setup />} />
                  <Route path="online/:code" element={<OnlineRoute match />} />
                  <Route path="*" element={<Home />} />
                </Route>
              </Routes>
            </Guarded>
          </BrowserRouter>
        </MotionConfig>
      ) : (
        loading
      )}
    </>
  );
}
// O idioma da sessão vale desde a primeira tela (e o `<html lang>` acompanha).
setLang(lang());
installErrorReporting();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
