import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
// A partida (motor, animações, confete) só é baixada ao abrir uma fase.
const PuzzlePage = lazy(() =>
  import("./features/PuzzlePage").then((m) => ({ default: m.PuzzlePage })),
);
import { usePlayer } from "./stores/player";
import "./app/styles.css";
import "./animations/animations.css";
import "./animations/mood.css";
import { unlockAudio } from "./services/sound";
import { keepScreenOn } from "./services/wakeLock";
import { resumeMusic } from "./services/music";
import { MusicController } from "./components/MusicController";
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
function GameRoute() {
  const { pathname, search } = useLocation();
  return (
    <Suspense fallback={<div className="loading">Abrindo a fase…</div>}>
      <PuzzlePage key={pathname + search} />
    </Suspense>
  );
}
/** Uma tela que quebra não derruba as outras: o erro some quando o jogador navega. */
function Guarded({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
function App() {
  const { ready, hydrate, player } = usePlayer();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const loading = (
    <div className="loading">
      <span className="game-art art-book" aria-hidden="true" />
      Preparando sua aventura…
    </div>
  );
  return (
    <>
      <StudioSplash ready={ready} />
      {ready ? (
        <MotionConfig reducedMotion={player.animations ? "user" : "always"}>
          <BrowserRouter>
            <MusicController />
            <Guarded>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="map" element={<Campaign />} />
                  <Route path="map/:world" element={<WorldMap />} />
                  <Route path="casual" element={<Casual />} />
                  <Route path="daily" element={<Daily />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="credits" element={<Credits />} />
                  <Route path="play/:id" element={<GameRoute />} />
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
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
