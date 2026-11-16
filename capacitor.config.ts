import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.wordquest.game",
  appName: "WordQuest",
  webDir: "dist",
  android: { allowMixedContent: false },
  backgroundColor: "#fff5de",
  // O index.html usa viewport-fit=cover: avisar de antemão evita um salto de layout na abertura.
  plugins: { SystemBars: { initialViewportFitValueHint: "cover" } },
};

export default config;
