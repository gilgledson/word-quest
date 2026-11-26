/**
 * Duelo ao vivo no Firebase: login anônimo + Realtime Database. Cada sala fica em
 * `rooms/<código>`; o estado da partida vai como texto (JSON), porque o banco descarta listas
 * e objetos vazios e a partida depende deles.
 */
import { Capacitor } from "@capacitor/core";
import { appCheckWorks } from "./appCheck";
import { firebaseApp } from "./firebaseApp";
import type { FirebaseApp } from "firebase/app";
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
import {
  ROOM_EXPIRED,
  isLive,
  type OnlineRoom,
  type OnlineSeat,
} from "../game/online";
import type { LobbyEntry } from "../game/matchmaking";
import { UnverifiedError, type JoinResult, type OnlineBackend } from "./online";

interface StoredRoom extends Omit<OnlineRoom, "state" | "grid"> {
  state: string;
  /** A grade em texto (JSON), gravada só ao criar a sala: as jogadas não a reenviam. */
  grid?: string;
  online?: Record<string, true>;
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
  const { online: _online, state, grid, ...rest } = stored;
  return {
    ...rest,
    ...(grid ? { grid: gridOf(grid) } : {}),
    state: JSON.parse(state),
  };
};

/**
 * Recusa por falta de App Check (bloqueio ligado no console) vira `UnverifiedError`, para o jogador
 * ler o motivo. O login recusa com um código próprio; o banco só diz "permission denied", então
 * confere se a verificação deste aparelho está falhando.
 */
async function explain(app: FirebaseApp, error: unknown): Promise<unknown> {
  const text = String(
    (error as { code?: string })?.code ?? (error as Error)?.message ?? error,
  ).toLowerCase();
  const native = Capacitor.isNativePlatform();
  if (text.includes("app-check")) return new UnverifiedError(native);
  if (text.includes("permission") && !(await appCheckWorks(app)))
    return new UnverifiedError(native);
  return error;
}

export function firebaseBackend(): OnlineBackend {
  const app = firebaseApp();
  const explained =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    (...args: A) =>
      fn(...args).catch(async (e) => {
        throw await explain(app, e);
      });
  const auth = getAuth(app);
  const db = getDatabase(app);
  const room = (code: string) => ref(db, `rooms/${code}`);
  let me: Promise<string> | undefined;
  const uid = () =>
    (me ??= signInAnonymously(auth).then((c) => c.user.uid)).catch((e) => {
      me = undefined;
      throw e;
    });
  const backend: OnlineBackend = {
    uid,
    async create(data) {
      await uid();
      const result = await runTransaction(room(data.code), (current) =>
        current === null
          ? {
              ...pack(data),
              ...(data.grid ? { grid: JSON.stringify(data.grid) } : {}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
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
          return {
            ...current,
            guest: seat,
            status: "playing",
            updatedAt: Date.now(),
          };
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
          return { ...current, ...next, updatedAt: Date.now() };
        },
      );
      return result.committed;
    },
    async abandon(code, who, by = who) {
      const snap = await get(room(code));
      const current = snap.val() as StoredRoom | null;
      if (!current || current.status === "finished") return;
      await update(room(code), {
        status: "abandoned",
        left: who,
        endedBy: by,
        updatedAt: Date.now(),
      });
    },
    async expire(code) {
      await uid();
      const current = (await get(room(code))).val() as StoredRoom | null;
      if (!current || !isLive(current)) return;
      await update(room(code), {
        status: "abandoned",
        left: null,
        endedBy: ROOM_EXPIRED,
        updatedAt: Date.now(),
      });
    },
    presence(code, who, onOnline) {
      const mine = ref(db, `rooms/${code}/online/${who}`);
      // A cada (re)conexão: o servidor apaga a presença se a conexão cair e ela é gravada de novo.
      // Sem isso, depois de uma queda (app em segundo plano, troca de Wi-Fi para dados) o servidor
      // apagava a presença e ela não voltava: o amigo seguia "sem conexão" mesmo jogando.
      const stopConnected = onValue(ref(db, ".info/connected"), (snap) => {
        if (snap.val() !== true) return;
        void onDisconnect(mine)
          .remove()
          .then(() => set(mine, true))
          .catch(() => {});
      });
      const stop = onValue(ref(db, `rooms/${code}/online`), (snap) =>
        onOnline(Object.keys((snap.val() as Record<string, true>) ?? {})),
      );
      return () => {
        stopConnected();
        stop();
        void onDisconnect(mine)
          .cancel()
          .catch(() => {});
        void remove(mine).catch(() => {});
      };
    },
    async lobby(lang) {
      await uid();
      const all = (await get(ref(db, `lobby/${lang}`))).val() as Record<
        string,
        Omit<LobbyEntry, "code">
      > | null;
      return Object.entries(all ?? {}).map(([code, e]) => ({ ...e, code }));
    },
    async list(lang, { code, ...entry }) {
      await set(ref(db, `lobby/${lang}/${code}`), entry);
    },
    async unlist(lang, code) {
      await remove(ref(db, `lobby/${lang}/${code}`));
    },
    async withdraw(code) {
      // Na mesma transação: se o convidado entrou neste instante, a sala fica e a partida começa.
      const result = await runTransaction(
        room(code),
        (current: StoredRoom | null) =>
          current?.guest || (current && current.status !== "waiting")
            ? undefined
            : null,
      );
      return result.committed;
    },
  };
  return {
    ...backend,
    uid: explained(backend.uid),
    create: explained(backend.create),
    peek: explained(backend.peek),
    join: explained(backend.join),
  };
}
