/**
 * "Minhas partidas": os duelos por turnos que o jogador acompanha (`Player.onlineMatches`). Um
 * observador só (no layout) acompanha cada sala da lista e guarda o estado delas aqui, para o aviso
 * "Sua vez!", o cartão da tela inicial e a lista do lobby. Ele também arruma a lista: sala que sumiu
 * ou não é mais do jogador sai (com a aposta acertada), sala sem ninguém há 48 h expira e partida
 * em que quem estava na vez passou do prazo é encerrada (o outro vence).
 */
import { useEffect } from "react";
import { create } from "zustand";
import {
  ROOM_TIMEOUT,
  isExpired,
  isLive,
  matchCodes,
  matchState,
  rivalSeat,
  roleOf,
  timedOutUid,
  withMatch,
  type MatchState,
  type OnlineRoom,
  type OnlineSeat,
} from "../game/online";
import {
  onlineAvailable,
  onlineBackend,
  type OnlineBackend,
} from "../services/online";
import { usePlayer } from "../stores/player";
import { track } from "../services/telemetry";
import { forget, wagerResult } from "./onlineCleanup";
import { enableDuelPush } from "../services/push";

interface MatchesStore {
  /** Este jogador no servidor (depois do login). */
  uid?: string;
  /** Sala de cada código da lista (`null` = não existe mais). */
  rooms: Record<string, OnlineRoom | null>;
}
export const useMatches = create<MatchesStore>(() => ({ rooms: {} }));

/** Partida acabada que o jogador nunca abriu sai da lista depois disto. */
const ENDED_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** Uma partida da lista, como as telas mostram. */
export interface MatchItem {
  code: string;
  room: OnlineRoom;
  state: MatchState;
  rival?: OnlineSeat;
}
/** As partidas da lista que já carregaram, na ordem da lista (a vez do jogador primeiro). */
export function matchItems(
  codes: string[],
  { uid, rooms }: MatchesStore,
  now = Date.now(),
): MatchItem[] {
  if (!uid) return [];
  const order: Record<MatchState, number> = {
    yourTurn: 0,
    ended: 1,
    theirTurn: 2,
    waiting: 3,
  };
  return codes
    .flatMap((code) => {
      const room = rooms[code];
      const role = room ? roleOf(room, uid) : undefined;
      if (!room || !role) return [];
      return [
        {
          code,
          room,
          state: matchState(room, uid, now),
          rival: rivalSeat(room, role),
        },
      ];
    })
    .sort((a, b) => order[a.state] - order[b.state]);
}
/** A lista "Minhas partidas" já carregada (re-renderiza quando a lista ou uma sala muda). */
export function useMatchItems() {
  const codes = usePlayer((s) => s.player.onlineMatches);
  const store = useMatches();
  return matchItems(codes ?? [], store);
}

/** Cuida da lista quando uma sala muda (ver o comentário do arquivo). */
function tidy(
  backend: OnlineBackend,
  uid: string,
  code: string,
  room: OnlineRoom | null,
) {
  if (!room || !roleOf(room, uid))
    return forget(
      code,
      room && roleOf(room, uid) ? wagerResult(room, uid) : "draw",
    );
  if (isExpired(room)) return void backend.expire(code).catch(() => {});
  const loser = timedOutUid(room);
  if (loser) {
    track("online_timeout", { mine: loser === uid });
    return void backend.abandon(code, loser, ROOM_TIMEOUT).catch(() => {});
  }
  const last = room.updatedAt ?? room.createdAt ?? Date.now();
  if (!isLive(room) && Date.now() - last > ENDED_KEEP_MS)
    forget(code, wagerResult(room, uid));
}

/** Observador das partidas da lista (fica no layout, uma vez só). */
export function MatchesWatcher() {
  const key = usePlayer((s) => matchCodes(s.player).join(","));
  useEffect(() => {
    const codes = key ? key.split(",") : [];
    if (!codes.length || !onlineAvailable()) {
      useMatches.setState({ rooms: {} });
      return;
    }
    // Marca antiga (uma partida só, de antes da lista): passa para a lista.
    const legacy = usePlayer.getState().player.activeOnline;
    if (legacy && codes.includes(legacy))
      usePlayer
        .getState()
        .update((p) => withMatch({ ...p, activeOnline: undefined }, legacy));
    // Quem já deu a permissão tem o token renovado (ele muda de vez em quando).
    void enableDuelPush({ ask: false });
    let alive = true;
    const stops: (() => void)[] = [];
    void (async () => {
      try {
        const backend = await onlineBackend();
        const uid = await backend.uid();
        if (!alive) return;
        useMatches.setState({ uid });
        for (const code of codes)
          stops.push(
            backend.watch(code, (room) => {
              if (!alive) return;
              useMatches.setState((s) => ({
                rooms: { ...s.rooms, [code]: room },
              }));
              tidy(backend, uid, code, room);
            }),
          );
      } catch {
        // Sem internet: a lista fica como está e é conferida na próxima abertura.
      }
    })();
    return () => {
      alive = false;
      stops.forEach((stop) => stop());
    };
  }, [key]);
  return null;
}
