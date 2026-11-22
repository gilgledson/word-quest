/// <reference types="vite/client" />
/** Versão do pacote web em uso ("builtin" = o que veio dentro do APK). */
declare const __BUNDLE_VERSION__: string;
/** Quando o build foi gerado (AAAAMMDD-HHMM, UTC). */
declare const __BUILD_STAMP__: string;
interface ImportMetaEnv {
  /** Token de depuração do App Check (só no `.env.local`; ver `src/services/appCheck.ts`). */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
  readonly VITE_ONLY_BUNDLED_CONTENT?: string;
}
