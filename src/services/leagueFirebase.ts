/**
 * Liga semanal no Firebase: o mesmo login anônimo do duelo ao vivo, a Function `leagueJoin` para
 * entrar num grupo e o Realtime Database para as linhas do grupo e o resultado da semana.
 */
import { getAuth, signInAnonymously } from "firebase/auth";
import { get, getDatabase, ref, serverTimestamp, set } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "./firebaseApp";
import type {
  LeagueBackend,
  LeagueEntry,
  LeagueSeat,
  LeagueState,
} from "./league";

export function firebaseLeague(): LeagueBackend {
  const app = firebaseApp();
  const auth = getAuth(app);
  const db = getDatabase(app);
  const joinCall = httpsCallable<
    void,
    LeagueSeat | { week: string; pending: true }
  >(getFunctions(app, "us-central1"), "leagueJoin");
  let me: Promise<string> | undefined;
  const uid = () =>
    (me ??= signInAnonymously(auth).then((c) => c.user.uid)).catch((e) => {
      me = undefined;
      throw e;
    });
  const groupPath = (s: LeagueSeat) => `leagues/${s.week}/${s.tier}/${s.group}`;
  return {
    uid,
    async join() {
      await uid();
      const { data } = await joinCall();
      return "pending" in data ? null : data;
    },
    async send(seat, row) {
      const id = await uid();
      await set(ref(db, `${groupPath(seat)}/${id}`), {
        ...row,
        at: serverTimestamp(),
      });
    },
    async group(seat) {
      await uid();
      const rows = (await get(ref(db, groupPath(seat)))).val() ?? {};
      return Object.entries(
        rows as Record<string, Omit<LeagueEntry, "uid">>,
      ).map(([id, row]) => ({ uid: id, ...row }));
    },
    async state() {
      const id = await uid();
      return ((await get(ref(db, `leagueState/${id}`))).val() ??
        null) as LeagueState | null;
    },
  };
}
