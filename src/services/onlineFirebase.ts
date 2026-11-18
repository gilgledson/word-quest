/**
 * Duelo ao vivo no Firebase: login anônimo + Realtime Database. Cada sala fica em
 * `rooms/<código>`; o estado da partida vai como texto (JSON), porque o banco descarta listas
 * e objetos vazios e a partida depende deles.
 */
import { firebaseApp } from "./firebaseApp";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from "firebase/database";
import type { OnlineRoom, OnlineSeat } from "../game/online";
import type { JoinResult, OnlineBackend } from "./online";

interface StoredRoom extends Omit<OnlineRoom, "state" | "grid"> {
  state: string;
  /** A grade em texto (JSON), gravada só ao criar a sala: as jogadas não a reenviam. */
  grid?: string;
  online?: Record<string, true>;
  createdAt?: number;
}
const pack = (room: OnlineRoom): StoredRoom => {
  const { state, guest, left, grid: _grid, ...rest } = room;
  return {
    ...rest,
    ...(guest ? { guest } : {}),
    ...(left ? { left } : {}),
    state: JSON.stringify(state),
  };
};
/**
 * A grade chega de novo a cada jogada (a sala inteira); lida uma vez por texto, ela continua o
 * mesmo objeto e a partida não monta o motor de novo.
 */
const grids = new Map<string, OnlineRoom["grid"]>();
const gridOf = (text: string) => {
  if (!grids.has(text)) grids.set(text, JSON.parse(text));
  return grids.get(text);
};
const unpack = (stored: StoredRoom | null): OnlineRoom | null => {
  if (!stored?.state) return null;
  const {
    online: _online,
    createdAt: _createdAt,
    state,
    grid,
    ...rest
  } = stored;
  return {
    ...rest,
    ...(grid ? { grid: gridOf(grid) } : {}),
    state: JSON.parse(state),
  };
};

export function firebaseBackend(): OnlineBackend {
  const app = firebaseApp();
  const auth = getAuth(app);
  const db = getDatabase(app);
  const room = (code: string) => ref(db, `rooms/${code}`);
  let me: Promise<string> | undefined;
  const uid = () =>
    (me ??= signInAnonymously(auth).then((c) => c.user.uid)).catch((e) => {
      me = undefined;
      throw e;
    });
  return {
    uid,
    async create(data) {
      await uid();
      const result = await runTransaction(room(data.code), (current) =>
        current === null
          ? {
              ...pack(data),
              ...(data.grid ? { grid: JSON.stringify(data.grid) } : {}),
              createdAt: Date.now(),
            }
          : undefined,
      );
      return result.committed;
    },
    async peek(code: string) {
      await uid();
      return unpack((await get(room(code))).val());
    },
    async join(code: string, seat: OnlineSeat): Promise<JoinResult> {
      await uid();
      if (!(await get(room(code))).exists())
        return { ok: false, reason: "missing" };
      let reason: "full" | "over" | undefined;
      const result = await runTransaction(
        room(code),
        (current: StoredRoom | null) => {
          if (!current) return current;
          reason = undefined;
          if (current.host.uid === seat.uid || current.guest?.uid === seat.uid)
            return current;
          if (current.guest) {
            reason = "full";
            return undefined;
          }
          if (current.status !== "waiting") {
            reason = "over";
            return undefined;
          }
          return { ...current, guest: seat, status: "playing" };
        },
      );
      const joined = unpack(result.snapshot.val());
      if (reason || !joined) return { ok: false, reason: reason ?? "missing" };
      return { ok: true, room: joined };
    },
    watch(code, onRoom) {
      return onValue(room(code), (snap) => onRoom(unpack(snap.val())));
    },
    async play(data) {
      const next = pack(data);
      const result = await runTransaction(
        room(data.code),
        (current: StoredRoom | null) => {
          if (!current || current.status !== "playing") return undefined;
          if (current.rev !== data.rev - 1) return undefined;
          return { ...current, ...next };
        },
      );
      return result.committed;
    },
    async abandon(code, who, by = who) {
      const snap = await get(room(code));
      const current = snap.val() as StoredRoom | null;
      if (!current || current.status === "finished") return;
      await update(room(code), { status: "abandoned", left: who, endedBy: by });
    },
    presence(code, who, onOnline) {
      const mine = ref(db, `rooms/${code}/online/${who}`);
      void onDisconnect(mine)
        .remove()
        .then(() => set(mine, true))
        .catch(() => {});
      const stop = onValue(ref(db, `rooms/${code}/online`), (snap) =>
        onOnline(Object.keys((snap.val() as Record<string, true>) ?? {})),
      );
      return () => {
        stop();
        void remove(mine).catch(() => {});
      };
    },
  };
}
