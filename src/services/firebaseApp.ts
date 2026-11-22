import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { startAppCheck } from "./appCheck";
import { firebaseConfig } from "./firebaseConfig";

/**
 * O app do Firebase desta página, criado uma vez só (o duelo ao vivo e o Analytics web o dividem).
 * O App Check é ligado junto, antes de qualquer login ou leitura do banco.
 */
export const firebaseApp = (): FirebaseApp => {
  const existing = getApps()[0];
  if (existing) return existing;
  const app = initializeApp(firebaseConfig);
  startAppCheck(app);
  return app;
};
