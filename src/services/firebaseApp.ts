import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "./firebaseConfig";

/** O app do Firebase desta página, criado uma vez só (o duelo ao vivo e o Analytics web o dividem). */
export const firebaseApp = (): FirebaseApp =>
  getApps()[0] ?? initializeApp(firebaseConfig);
