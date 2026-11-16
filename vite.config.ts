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
        background_color: "#e6f3fe",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  // Versão do pacote web: "builtin" no que vai dentro do APK; a publicação ao vivo
  // (scripts/publish-app.mjs) gera cada pacote com BUNDLE_VERSION próprio.
  define: {
    __BUNDLE_VERSION__: JSON.stringify(process.env.BUNDLE_VERSION ?? "builtin"),
    // Quando este build foi gerado (AAAAMMDD-HHMM, UTC): um pacote ao vivo só entra se for mais novo.
    __BUILD_STAMP__: JSON.stringify(
      process.env.BUILD_STAMP ??
        new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace("T", "-")
          .slice(0, 13),
    ),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    // e2e/ é do Playwright (npm run test:e2e).
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
