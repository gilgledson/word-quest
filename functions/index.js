/**
 * Notificações do duelo por turnos (Cloud Functions, plano Blaze):
 * - `roomNotices`: quando uma sala muda, avisa quem precisa (é sua vez, partida terminou, prazo);
 * - `turnSweep`: de hora em hora encerra partidas com o prazo de 48 h vencido (o aviso sai pela
 *   mudança da sala), encerra salas sem ninguém há 48 h e lembra quem está na vez a 12 h do fim.
 * Os tokens ficam em `push/<uid>/<chave>` ({ token, lang, at }), gravados pelo app (src/services/push.ts).
 *
 * Ligas semanais (docs/planos/ligas-semanais.md; regras puras em league.js):
 * - `leagueJoin`: põe o jogador num grupo da liga dele na semana (uma vez por semana);
 * - `leagueClose`: toda segunda 00:05 UTC fecha a semana anterior (quem sobe, quem desce, moedas).
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall } from "firebase-functions/v2/https";
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
import {
  closeWeekUpdates,
  nextSeat,
  previousWeek,
  tierOf,
  weekOf,
} from "./league.js";

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

/**
 * Assento do jogador na liga desta semana: o mesmo se ele já entrou; senão, o grupo aberto da liga
 * dele (`leagueState/{uid}/tier`, Bronze para quem nunca jogou). Enquanto a semana anterior em que
 * ele jogou não foi fechada (segunda entre 00:00 e 00:05 UTC), responde `{ pending: true }`.
 */
export const leagueJoin = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "login");
  const db = getDatabase();
  const week = weekOf(Date.now());
  const seatRef = db.ref(`leagueSeat/${week}/${uid}`);
  const seat = (await seatRef.get()).val();
  if (seat) return { week, ...seat };
  const last = previousWeek(week);
  const [played, closed, state] = await Promise.all([
    db.ref(`leagueSeat/${last}/${uid}`).get(),
    db.ref(`leagueClosed/${last}`).get(),
    db.ref(`leagueState/${uid}/tier`).get(),
  ]);
  if (played.exists() && !closed.exists()) return { week, pending: true };
  const tier = tierOf(state.val() ?? undefined);
  let taken;
  await db.ref(`leagueOpen/${week}/${tier}`).transaction((open) => {
    taken = nextSeat(open);
    return taken;
  });
  const mine = { tier, group: String(taken.group) };
  // Se duas chamadas correram juntas, vale o assento gravado primeiro.
  const result = await seatRef.transaction((current) => current ?? mine);
  logger.info("liga: entrou", { tier, group: mine.group });
  return { week, ...result.snapshot.val() };
});

/** Semanas guardadas depois de fechadas (as mais antigas são apagadas). */
const KEEP_WEEKS = 3;

export const leagueClose = onSchedule(
  { schedule: "5 0 * * 1", timeZone: "UTC" },
  async () => {
    const db = getDatabase();
    const week = previousWeek(weekOf(Date.now()));
    // Fecha primeiro: daqui em diante as regras recusam XP novo nessa semana.
    await db.ref(`leagueClosed/${week}`).set(true);
    const leagues = (await db.ref(`leagues/${week}`).get()).val() ?? {};
    const entries = Object.entries(closeWeekUpdates(week, leagues));
    for (let i = 0; i < entries.length; i += 500)
      await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)));
    logger.info("liga: semana fechada", { week, players: entries.length });
    // Apaga as semanas antigas (os resultados já estão em leagueState).
    let old = week;
    for (let i = 0; i < KEEP_WEEKS; i++) old = previousWeek(old);
    for (let i = 0; i < 3; i++, old = previousWeek(old))
      await db.ref().update({
        [`leagues/${old}`]: null,
        [`leagueSeat/${old}`]: null,
        [`leagueOpen/${old}`]: null,
      });
  },
);
