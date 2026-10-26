import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.wordquest.game",
  appName: "WordQuest",
  webDir: "dist",
  android: { allowMixedContent: false },
  backgroundColor: "#fff5de",
};

export default config;
