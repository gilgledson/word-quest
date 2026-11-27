/**
 * Servidor do duelo ao vivo. O jogo só conversa com a interface `OnlineBackend`; a implementação
 * de verdade usa o Firebase (Realtime Database + login anônimo) e é baixada só quando o jogador
 * abre o modo online. Trocar de servidor depois (uma VPS, por exemplo) é escrever outra
 * implementação desta interface.
 */
import {
  ROOM_EXPIRED,
  guestStarts,
  isLive,
  type OnlineRoom,
  type OnlineSeat,
} from "../game/online";
import type { LobbyEntry } from "../game/matchmaking";
import { onlineText as T } from "../i18n/online";
import { onlineConfigured } from "./firebaseConfig";

export type JoinResult =
  | { ok: true; room: OnlineRoom }
  | { ok: false; reason: "missing" | "full" | "over" };

export interface OnlineBackend {
  /** Identidade anônima deste aparelho no servidor. */
  uid(): Promise<string>;
  /** Cria a sala; devolve false se o código já existe. */
  create(room: OnlineRoom): Promise<boolean>;
  /** Lê a sala sem entrar nela (para o convidado ver as regras antes). */
  peek(code: string): Promise<OnlineRoom | null>;
  /** Entra como convidado (ou volta para uma sala de que já faz parte). */
  join(code: string, me: OnlineSeat): Promise<JoinResult>;
  /** Acompanha a sala; `null` quando ela não existe. Devolve como parar. */
  watch(code: string, onRoom: (room: OnlineRoom | null) => void): () => void;
  /**
   * Grava a jogada `room.rev`. Só vale se a sala ainda está na jogada anterior: dois envios ao
   * mesmo tempo não se atropelam. Devolve se gravou.
   */
  play(room: OnlineRoom): Promise<boolean>;
  /** Encerra a partida porque `uid` saiu; `by` é quem encerrou (padrão: o próprio `uid`). */
  abandon(code: string, uid: string, by?: string): Promise<void>;
  /** Encerra uma sala que ficou parada (ver `isExpired`), sem vencedor. Só se ainda estiver aberta. */
  expire(code: string): Promise<void>;
  /**
   * Marca este jogador como conectado e avisa quando a lista de conectados muda. O servidor
   * desmarca sozinho se a conexão cair. Devolve como parar.
   */
  presence(
    code: string,
    uid: string,
    onOnline: (uids: string[]) => void,
  ): () => void;
  /** Salas públicas esperando oponente num idioma ("Procurar oponente"). */
  lobby(lang: string): Promise<LobbyEntry[]>;
  /** Põe a sala na lista pública do idioma. */
  list(lang: string, entry: LobbyEntry): Promise<void>;
  /** Tira a sala da lista pública (quem entrou, quem desistiu ou uma esquecida). */
  unlist(lang: string, code: string): Promise<void>;
  /**
   * Apaga a sala de quem desistiu de esperar, só se ninguém entrou nela. Devolve false quando
   * alguém acabou de entrar (a partida começa).
   */
  withdraw(code: string): Promise<boolean>;
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

/**
 * O servidor recusou este aparelho porque a verificação do App Check falhou (ou o app é de uma
 * versão sem ela). Só aparece com o bloqueio ligado no console.
 */
export class UnverifiedError extends Error {
  constructor(readonly native: boolean) {
    super("app-check");
  }
}

/** O que dizer ao jogador quando o duelo ao vivo falha. */
export function onlineErrorText(error: unknown) {
  if (error instanceof UnverifiedError)
    return error.native ? T.updateApp : T.unverifiedBrowser;
  return T.unavailable;
}

/** Servidor em memória: dois "aparelhos" na mesma página. Usado nos testes. */
export function memoryBackend() {
  const rooms = new Map<string, OnlineRoom>();
  const lobbies = new Map<string, Map<string, LobbyEntry>>();
  const lobbyOf = (lang: string) => {
    if (!lobbies.has(lang)) lobbies.set(lang, new Map());
    return lobbies.get(lang)!;
  };
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
      const now = Date.now();
      rooms.set(room.code, { createdAt: now, updatedAt: now, ...copy(room) });
      tell(room.code);
      return true;
    },
    async peek(code) {
      return rooms.has(code) ? copy(rooms.get(code)!) : null;
    },
    async join(code, me) {
      const room = rooms.get(code);
      if (!room) return { ok: false, reason: "missing" };
      if (room.host.uid !== me.uid && room.guest?.uid !== me.uid) {
        if (room.guest) return { ok: false, reason: "full" };
        if (room.status !== "waiting") return { ok: false, reason: "over" };
        room.guest = copy(me);
        room.status = "playing";
        room.state = guestStarts(room.state);
        room.updatedAt = Date.now();
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
      rooms.set(room.code, {
        ...current,
        ...copy(room),
        updatedAt: Date.now(),
      });
      tell(room.code);
      return true;
    },
    async abandon(code, who, by = who) {
      const room = rooms.get(code);
      if (!room || room.status === "finished") return;
      room.status = "abandoned";
      room.left = who;
      room.endedBy = by;
      room.updatedAt = Date.now();
      tell(code);
    },
    async expire(code) {
      const room = rooms.get(code);
      if (!room || !isLive(room)) return;
      room.status = "abandoned";
      delete room.left;
      room.endedBy = ROOM_EXPIRED;
      room.updatedAt = Date.now();
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
    async lobby(lang) {
      return copy([...lobbyOf(lang).values()]);
    },
    async list(lang, entry) {
      lobbyOf(lang).set(entry.code, copy(entry));
    },
    async unlist(lang, code) {
      lobbyOf(lang).delete(code);
    },
    async withdraw(code) {
      const room = rooms.get(code);
      if (room && (room.guest || room.status !== "waiting")) return false;
      rooms.delete(code);
      tell(code);
      return true;
    },
  });
  return { as, rooms, lobbies };
}
