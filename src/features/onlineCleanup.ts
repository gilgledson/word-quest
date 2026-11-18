/**
 * Limpeza do duelo ao vivo marcado como "em andamento" (`player.activeOnline`), que alimenta o
 * aviso "Partida em andamento" no topo das telas. Sem isto, uma sala em que ninguém entrou, ou em
 * que os dois pararam de jogar, ficava aberta para sempre e o aviso nunca saía da tela.
 */
import { useEffect } from "react";
import {
  betPayout,
  isExpired,
  isLive,
  ROOM_EXPIRED,
  roleOf,
  toView,
  type OnlineRoom,
} from "../game/online";
import { onlineAvailable, onlineBackend } from "../services/online";
import { usePlayer } from "../stores/player";
import { track } from "../services/telemetry";

/** Resultado da aposta numa sala que já acabou (ou sumiu: devolve, como empate). */
export function wagerResult(
  room: OnlineRoom | null,
  uid: string,
): "win" | "draw" | "loss" {
  if (!room) return "draw";
  if (room.status === "abandoned")
    return room.endedBy === ROOM_EXPIRED
      ? "draw"
      : room.left !== uid
        ? "win"
        : "loss";
  const role = roleOf(room, uid);
  if (room.status !== "finished" || !role) return "draw";
  const mine = toView(room.state, role).scores;
  return mine.p > mine.ai ? "win" : mine.p === mine.ai ? "draw" : "loss";
}

/** Tira a marca da partida e acerta a aposta que ainda estava reservada para ela. */
function forget(code: string, result: "win" | "draw" | "loss") {
  usePlayer.getState().update((p) => {
    const reserved = p.wagers?.[code];
    const wagers = { ...p.wagers };
    delete wagers[code];
    return {
      ...p,
      activeOnline: p.activeOnline === code ? undefined : p.activeOnline,
      coins: p.coins + (reserved ? betPayout(reserved, result) : 0),
      wagers,
    };
  });
}

/**
 * O jogador encerra a partida pelo aviso: cancela a sala (se ninguém entrou) ou desiste (conta
 * como derrota). Sem internet, só tira o aviso; a sala expira sozinha depois.
 */
export async function endOnlineMatch(code: string) {
  track("online_end_from_notice");
  try {
    const backend = await onlineBackend();
    const uid = await backend.uid();
    const room = await backend.peek(code);
    if (room && isLive(room)) await backend.abandon(code, uid);
    const after =
      room && isLive(room)
        ? { ...room, status: "abandoned" as const, left: uid }
        : room;
    forget(
      code,
      after && roleOf(after, uid) ? wagerResult(after, uid) : "draw",
    );
  } catch {
    forget(code, "loss");
  }
}

/**
 * Confere, ao abrir o jogo (e a cada partida marcada), se a sala marcada ainda está aberta: se
 * sumiu, acabou, não é mais deste jogador ou ficou parada demais, tira o aviso. Não roda na tela
 * da própria sala, que cuida disso sozinha.
 */
export function useActiveOnlineCheck(
  code: string | undefined,
  onRoomPage: boolean,
) {
  useEffect(() => {
    if (!code || onRoomPage || !onlineAvailable()) return;
    let alive = true;
    void (async () => {
      try {
        const backend = await onlineBackend();
        const uid = await backend.uid();
        let room = await backend.peek(code);
        if (!alive) return;
        if (room && isExpired(room)) {
          await backend.expire(code);
          room = { ...room, status: "abandoned", endedBy: ROOM_EXPIRED };
          delete room.left;
        }
        if (!alive) return;
        if (!room || !isLive(room) || !roleOf(room, uid))
          forget(
            code,
            room && roleOf(room, uid) ? wagerResult(room, uid) : "draw",
          );
      } catch {
        // Sem internet: deixa como está e confere de novo na próxima vez.
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, onRoomPage]);
}
