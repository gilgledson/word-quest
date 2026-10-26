import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
// No app Android os arquivos já vêm dentro do APK: sem service worker, e um sw.js "kill switch"
// remove o cache de versões antigas que o WebView guardou (senão o app continuaria mostrando a anterior).
const KILL_SWITCH = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll())
        client.navigate(client.url);
    })(),
  );
});
`;
export default defineConfig(({ mode }) => ({
  plugins: [
    mode === "capacitor" && {
      name: "android-kill-switch-sw",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: KILL_SWITCH,
        });
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      disable: mode === "capacitor",
      registerType: "autoUpdate",
      manifest: {
        name: "WordQuest — A Jornada das Palavras",
        short_name: "WordQuest",
        theme_color: "#3689f5",
        background_color: "#fff5de",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: "jsdom", setupFiles: ["./src/tests/setup.ts"] },
}));
