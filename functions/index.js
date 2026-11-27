/**
 * Notificações do duelo por turnos (Cloud Functions, plano Blaze):
 * - `roomNotices`: quando uma sala muda, avisa quem precisa (é sua vez, partida terminou, prazo);
 * - `turnSweep`: de hora em hora encerra partidas com o prazo de 48 h vencido (o aviso sai pela
 *   mudança da sala), encerra salas sem ninguém há 48 h e lembra quem está na vez a 12 h do fim.
 * Os tokens ficam em `push/<uid>/<chave>` ({ token, lang, at }), gravados pelo app (src/services/push.ts).
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";
import {
  ROOM_EXPIRED,
  ROOM_TIMEOUT,
  messageFor,
  noticesFor,
  sweepAction,
} from "./lib.js";

setGlobalOptions({ region: "us-central1", maxInstances: 5 });
initializeApp();
const INSTANCE = "wordquest-online-default-rtdb";

/** Tokens que o FCM diz não existirem mais: são apagados. */
const GONE = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

async function send(notice) {
  const db = getDatabase();
  const snap = await db.ref(`push/${notice.uid}`).get();
  const entries = Object.entries(snap.val() ?? {}).filter(([, v]) => v?.token);
  if (!entries.length) return 0;
  let sent = 0;
  // Um envio por idioma (cada aparelho guarda o seu).
  const byLang = new Map();
  for (const [key, v] of entries) {
    const lang = v.lang === "en" ? "en" : "pt";
    byLang.set(lang, [...(byLang.get(lang) ?? []), { key, token: v.token }]);
  }
  for (const [lang, list] of byLang) {
    const { title, body } = messageFor(notice, lang);
    const res = await getMessaging().sendEachForMulticast({
      tokens: list.map((t) => t.token),
      notification: { title, body },
      data: {
        route: `/online/${notice.code}`,
        kind: notice.kind,
        code: notice.code,
      },
      android: {
        priority: "high",
        collapseKey: notice.code,
        notification: {
          channelId: "duelo",
          icon: "ic_stat_wordquest",
          tag: notice.code,
        },
      },
    });
    sent += res.successCount;
    await Promise.all(
      res.responses.map((r, i) =>
        !r.success && GONE.has(r.error?.code)
          ? db.ref(`push/${notice.uid}/${list[i].key}`).remove()
          : null,
      ),
    );
  }
  return sent;
}

export const roomNotices = onValueWritten(
  { ref: "/rooms/{code}", instance: INSTANCE },
  async (event) => {
    const before = event.data.before.val();
    const after = event.data.after.val();
    const notices = noticesFor(before, after);
    for (const notice of notices) {
      try {
        const sent = await send(notice);
        logger.info("aviso", { kind: notice.kind, code: notice.code, sent });
      } catch (error) {
        logger.error("falha no aviso", {
          code: notice.code,
          error: String(error),
        });
      }
    }
  },
);

export const turnSweep = onSchedule("every 60 minutes", async () => {
  const db = getDatabase();
  const now = Date.now();
  const [playing, waiting, reminded] = await Promise.all([
    db.ref("rooms").orderByChild("status").equalTo("playing").get(),
    db.ref("rooms").orderByChild("status").equalTo("waiting").get(),
    db.ref("reminders").get(),
  ]);
  const remindedRev = reminded.val() ?? {};
  const rooms = { ...(playing.val() ?? {}), ...(waiting.val() ?? {}) };
  for (const [code, room] of Object.entries(rooms)) {
    const action = sweepAction({ ...room, code }, now, remindedRev[code]);
    try {
      if (action.kind === "timeout" || action.kind === "expire") {
        // Na transação: se alguém jogou agora mesmo, não encerra.
        await db.ref(`rooms/${code}`).transaction((current) => {
          if (!current || current.status !== room.status) return undefined;
          if ((current.updatedAt ?? 0) !== (room.updatedAt ?? 0))
            return undefined;
          return action.kind === "timeout"
            ? {
                ...current,
                status: "abandoned",
                left: action.loser,
                endedBy: ROOM_TIMEOUT,
                updatedAt: now,
              }
            : {
                ...current,
                status: "abandoned",
                left: null,
                endedBy: ROOM_EXPIRED,
                updatedAt: now,
              };
        });
      } else if (action.kind === "remind") {
        await send(action.notice);
        await db.ref(`reminders/${code}`).set(room.rev ?? 0);
      }
    } catch (error) {
      logger.error("falha na checagem", { code, error: String(error) });
    }
  }
});
