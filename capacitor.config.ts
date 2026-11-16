import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.wordquest.game",
  appName: "WordQuest",
  webDir: "dist",
  android: { allowMixedContent: false },
  backgroundColor: "#fff5de",
  // O index.html usa viewport-fit=cover: avisar de antemão evita um salto de layout na abertura.
  plugins: {
    SystemBars: { initialViewportFitValueHint: "cover" },
    // Atualização ao vivo (src/services/liveUpdate.ts): o app só fala com o nosso Firebase Hosting.
    // Os endereços da Capgo (atualizações, estatísticas, canais) ficam vazios: nada vai para eles.
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: "",
      statsUrl: "",
      channelUrl: "",
      // Versão nova da loja: descarta os pacotes baixados para a versão anterior.
      resetWhenUpdate: true,
      // A versão nova tem 10 s para dizer que abriu; senão volta para a anterior.
      appReadyTimeout: 10000,
    },
  },
};

export default config;
