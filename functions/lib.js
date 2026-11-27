/**
 * Regras puras das notificações do duelo por turnos (sem Firebase): quem avisar quando a sala muda,
 * o texto de cada aviso e o que a checagem de hora em hora faz com cada partida. Testadas em
 * src/tests/push-functions.test.ts; usadas por index.js.
 *
 * A sala é a mesma do app (src/game/online.ts): `state` vai como texto (JSON) do ponto de vista de
 * quem criou ("p" = host, "ai" = convidado).
 */

/** Prazo de cada jogada (igual ao do app, TURN_DEADLINE_MS). */
export const TURN_DEADLINE_MS = 48 * 60 * 60 * 1000;
/** Lembrete quando faltam isto ou menos para o prazo acabar. */
export const REMIND_BEFORE_MS = 12 * 60 * 60 * 1000;
/** Sala esperando alguém há mais que isto é encerrada sem vencedor (igual ao app). */
export const ROOM_EXPIRE_MS = TURN_DEADLINE_MS;
export const ROOM_TIMEOUT = "prazo";
export const ROOM_EXPIRED = "expirada";

const parse = (state) => {
  try {
    return typeof state === "string" ? JSON.parse(state) : state;
  } catch {
    return undefined;
  }
};
/** Quem está na vez (uid) numa partida em jogo. */
export function turnUid(room) {
  if (!room || room.status !== "playing") return undefined;
  const turn = parse(room.state)?.versus?.turn;
  return turn === "p"
    ? room.host?.uid
    : turn === "ai"
      ? room.guest?.uid
      : undefined;
}
const seatOf = (room, uid) =>
  room.host?.uid === uid
    ? room.host
    : room.guest?.uid === uid
      ? room.guest
      : undefined;
const otherOf = (room, uid) =>
  room.host?.uid === uid
    ? room.guest
    : room.guest?.uid === uid
      ? room.host
      : undefined;
const nameOf = (seat) => seat?.name?.trim() || "?";

/** Resultado de quem é `uid` numa partida terminada. */
function resultOf(room, uid) {
  const scores = parse(room.state)?.scores ?? {};
  const host = scores.p ?? 0;
  const guest = scores.ai ?? 0;
  const mine = room.host?.uid === uid ? host : guest;
  const theirs = room.host?.uid === uid ? guest : host;
  return mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
}

/**
 * Avisos a mandar quando a sala passa de `before` para `after`:
 * - jogada nova → quem está na vez agora ("turn");
 * - partida terminada → quem não fez a última jogada (o resultado dele);
 * - prazo vencido → os dois (quem venceu e quem perdeu).
 */
export function noticesFor(before, after) {
  if (!after) return [];
  const code = after.code;
  const notices = [];
  const add = (uid, kind, extra = {}) => {
    if (!uid) return;
    notices.push({
      uid,
      kind,
      code,
      rival: nameOf(otherOf(after, uid)),
      ...extra,
    });
  };
  if (
    before?.status === "playing" &&
    after.status === "playing" &&
    (after.rev ?? 0) > (before.rev ?? 0)
  )
    add(turnUid(after), "turn");
  if (before?.status === "playing" && after.status === "finished") {
    // Quem estava na vez fez a jogada final; avisa o outro.
    const last = turnUid(before);
    const other = otherOf(after, last)?.uid;
    if (other) add(other, "finished", { result: resultOf(after, other) });
  }
  if (
    before?.status === "playing" &&
    after.status === "abandoned" &&
    after.endedBy === ROOM_TIMEOUT &&
    after.left
  ) {
    add(otherOf(after, after.left)?.uid, "timeoutWin");
    add(after.left, "timeoutLoss");
  }
  return notices;
}

const TEXTS = {
  pt: {
    turn: (n) => ({
      title: "Sua vez no WordQuest!",
      body: `${n} jogou. Faça sua jogada (você tem 48 h).`,
    }),
    remind: (n) => ({
      title: "Não perca a partida!",
      body: `Faltam menos de 12 h para sua jogada contra ${n}.`,
    }),
    finished: (n, r) => ({
      title:
        r === "win"
          ? "Você venceu!"
          : r === "draw"
            ? "Empate!"
            : "Partida encerrada",
      body:
        r === "win"
          ? `A partida contra ${n} terminou: vitória sua!`
          : r === "draw"
            ? `A partida contra ${n} terminou empatada.`
            : `${n} venceu a partida. Que tal a revanche?`,
    }),
    timeoutWin: (n) => ({
      title: "Vitória!",
      body: `${n} não jogou em 48 h. A vitória é sua.`,
    }),
    timeoutLoss: (n) => ({
      title: "Partida encerrada",
      body: `Você não jogou em 48 h e a vitória ficou com ${n}.`,
    }),
  },
  en: {
    turn: (n) => ({
      title: "Your turn in WordQuest!",
      body: `${n} played. Make your move (you have 48 h).`,
    }),
    remind: (n) => ({
      title: "Don't lose the match!",
      body: `Less than 12 h left for your move against ${n}.`,
    }),
    finished: (n, r) => ({
      title:
        r === "win" ? "You won!" : r === "draw" ? "It's a draw!" : "Match over",
      body:
        r === "win"
          ? `Your match against ${n} is over: you won!`
          : r === "draw"
            ? `Your match against ${n} ended in a draw.`
            : `${n} won the match. Rematch?`,
    }),
    timeoutWin: (n) => ({
      title: "Victory!",
      body: `${n} didn't play within 48 h. The win is yours.`,
    }),
    timeoutLoss: (n) => ({
      title: "Match over",
      body: `You didn't play within 48 h, so ${n} took the win.`,
    }),
  },
};
/** Título e texto do aviso no idioma do aparelho (o gravado com o token). */
export function messageFor(notice, lang) {
  const t = TEXTS[lang === "en" ? "en" : "pt"];
  return t[notice.kind](notice.rival, notice.result);
}

/**
 * O que a checagem de hora em hora faz com uma sala: encerrar por prazo (quem está na vez perde),
 * encerrar a espera sem ninguém, lembrar quem está na vez (uma vez por jogada) ou nada.
 */
export function sweepAction(room, now, remindedRev) {
  if (!room) return { kind: "none" };
  const last = room.updatedAt ?? room.createdAt;
  if (last === undefined) return { kind: "none" };
  if (room.status === "waiting")
    return now - last > ROOM_EXPIRE_MS ? { kind: "expire" } : { kind: "none" };
  if (room.status !== "playing") return { kind: "none" };
  const loser = turnUid(room);
  if (!loser) return { kind: "none" };
  const deadline = last + TURN_DEADLINE_MS;
  if (now > deadline) return { kind: "timeout", loser };
  if (deadline - now <= REMIND_BEFORE_MS && remindedRev !== room.rev)
    return {
      kind: "remind",
      notice: {
        uid: loser,
        kind: "remind",
        code: room.code,
        rival: nameOf(otherOf(room, loser)),
      },
    };
  return { kind: "none" };
}

/** Chave do token no banco (o token pode ter caracteres que o banco não aceita em chave). */
export const tokenKey = (token) =>
  token.replace(/[.#$[\]/]/g, "_").slice(0, 700);
export { seatOf };
