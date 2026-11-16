/**
 * Servidor do duelo ao vivo. O jogo só conversa com a interface `OnlineBackend`; a implementação
 * de verdade usa o Firebase (Realtime Database + login anônimo) e é baixada só quando o jogador
 * abre o modo online. Trocar de servidor depois (uma VPS, por exemplo) é escrever outra
 * implementação desta interface.
 */
import type { OnlineRoom, OnlineSeat } from "../game/online";
import { onlineConfigured } from "./firebaseConfig";

export type JoinResult =
  | { ok: true; room: OnlineRoom }
  | { ok: false; reason: "missing" | "full" | "over" };

export interface OnlineBackend {
  /** Identidade anônima deste aparelho no servidor. */
  uid(): Promise<string>;
  /** Cria a sala; devolve false se o código já existe. */
  create(room: OnlineRoom): Promise<boolean>;
  /** Entra como convidado (ou volta para uma sala de que já faz parte). */
  join(code: string, me: OnlineSeat): Promise<JoinResult>;
  /** Acompanha a sala; `null` quando ela não existe. Devolve como parar. */
  watch(code: string, onRoom: (room: OnlineRoom | null) => void): () => void;
  /**
   * Grava a jogada `room.rev`. Só vale se a sala ainda está na jogada anterior: dois envios ao
   * mesmo tempo não se atropelam. Devolve se gravou.
   */
  play(room: OnlineRoom): Promise<boolean>;
  /** Encerra a partida porque `uid` saiu. */
  abandon(code: string, uid: string): Promise<void>;
  /**
   * Marca este jogador como conectado e avisa quando a lista de conectados muda. O servidor
   * desmarca sozinho se a conexão cair. Devolve como parar.
   */
  presence(
    code: string,
    uid: string,
    onOnline: (uids: string[]) => void,
  ): () => void;
}

let backend: Promise<OnlineBackend> | undefined;
let faked = false;
/** O modo online pode ser usado neste build (há servidor configurado). */
export const onlineAvailable = () => faked || onlineConfigured;
/** O servidor em uso (carregado na primeira chamada). */
export const onlineBackend = () =>
  (backend ??= import("./onlineFirebase").then((m) => m.firebaseBackend()));
/** Só para testes: troca o servidor por um de mentira. */
export const setOnlineBackend = (fake: OnlineBackend | undefined) => {
  faked = !!fake;
  backend = fake ? Promise.resolve(fake) : undefined;
};

/** Servidor em memória: dois "aparelhos" na mesma página. Usado nos testes. */
export function memoryBackend() {
  const rooms = new Map<string, OnlineRoom>();
  const online = new Map<string, Set<string>>();
  const roomWatchers = new Map<string, Set<(r: OnlineRoom | null) => void>>();
  const presenceWatchers = new Map<string, Set<(u: string[]) => void>>();
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const tell = (code: string) =>
    roomWatchers
      .get(code)
      ?.forEach((w) => w(rooms.has(code) ? copy(rooms.get(code)!) : null));
  const tellPresence = (code: string) =>
    presenceWatchers
      .get(code)
      ?.forEach((w) => w([...(online.get(code) ?? [])]));
  const as = (uid: string): OnlineBackend => ({
    uid: async () => uid,
    async create(room) {
      if (rooms.has(room.code)) return false;
      rooms.set(room.code, copy(room));
      tell(room.code);
      return true;
    },
    async join(code, me) {
      const room = rooms.get(code);
      if (!room) return { ok: false, reason: "missing" };
      if (room.host.uid !== me.uid && room.guest?.uid !== me.uid) {
        if (room.guest) return { ok: false, reason: "full" };
        if (room.status !== "waiting") return { ok: false, reason: "over" };
        room.guest = copy(me);
        room.status = "playing";
        tell(code);
      }
      return { ok: true, room: copy(room) };
    },
    watch(code, onRoom) {
      const set = roomWatchers.get(code) ?? new Set();
      roomWatchers.set(code, set);
      set.add(onRoom);
      queueMicrotask(() =>
        onRoom(rooms.has(code) ? copy(rooms.get(code)!) : null),
      );
      return () => set.delete(onRoom);
    },
    async play(room) {
      const current = rooms.get(room.code);
      if (!current || current.status !== "playing") return false;
      if (current.rev !== room.rev - 1) return false;
      rooms.set(room.code, { ...current, ...copy(room) });
      tell(room.code);
      return true;
    },
    async abandon(code, who) {
      const room = rooms.get(code);
      if (!room || room.status === "finished") return;
      room.status = "abandoned";
      room.left = who;
      tell(code);
    },
    presence(code, who, onOnline) {
      const here = online.get(code) ?? new Set();
      online.set(code, here);
      here.add(who);
      const set = presenceWatchers.get(code) ?? new Set();
      presenceWatchers.set(code, set);
      set.add(onOnline);
      tellPresence(code);
      return () => {
        here.delete(who);
        set.delete(onOnline);
        tellPresence(code);
      };
    },
  });
  return { as, rooms };
}
