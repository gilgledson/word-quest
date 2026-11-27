import { describe, expect, it } from "vitest";
import {
  REMIND_BEFORE_MS,
  ROOM_TIMEOUT,
  TURN_DEADLINE_MS,
  messageFor,
  noticesFor,
  sweepAction,
  tokenKey,
  turnUid,
} from "../../functions/lib.js";

/** Sala como fica no banco: o estado é texto (JSON), do ponto de vista de quem criou. */
const room = (
  over: Record<string, unknown> = {},
  turn = "ai",
  scores = { p: 0, ai: 0 },
) => ({
  code: "ABC234",
  host: { uid: "gil", name: "Gil", avatar: "jogador" },
  guest: { uid: "bia", name: "Bia", avatar: "panda" },
  status: "playing",
  rev: 0,
  state: JSON.stringify({ versus: { turn }, scores }),
  createdAt: 1_000,
  updatedAt: 1_000,
  ...over,
});

describe("avisos do duelo por turnos (Cloud Functions)", () => {
  it("de quem é a vez sai do estado gravado", () => {
    expect(turnUid(room({}, "p"))).toBe("gil");
    expect(turnUid(room({}, "ai"))).toBe("bia");
    expect(turnUid(room({ status: "waiting" }))).toBeUndefined();
  });
  it("jogada nova avisa quem está na vez agora", () => {
    const before = room({ rev: 1 }, "ai");
    const after = room({ rev: 2 }, "p");
    expect(noticesFor(before, after)).toEqual([
      { uid: "gil", kind: "turn", code: "ABC234", rival: "Bia" },
    ]);
    // Sem jogada nova (só presença, por exemplo), ninguém é avisado.
    expect(noticesFor(after, { ...after })).toEqual([]);
  });
  it("partida terminada avisa quem não fez a última jogada, com o resultado dele", () => {
    const before = room({ rev: 9 }, "ai", { p: 10, ai: 8 });
    const after = room({ rev: 10, status: "finished" }, "ai", {
      p: 10,
      ai: 12,
    });
    expect(noticesFor(before, after)).toEqual([
      {
        uid: "gil",
        kind: "finished",
        code: "ABC234",
        rival: "Bia",
        result: "loss",
      },
    ]);
  });
  it("prazo vencido avisa os dois: quem venceu e quem perdeu", () => {
    const before = room({ rev: 3 }, "ai");
    const after = room({
      rev: 3,
      status: "abandoned",
      left: "bia",
      endedBy: ROOM_TIMEOUT,
    });
    expect(noticesFor(before, after).map((n) => [n.uid, n.kind])).toEqual([
      ["gil", "timeoutWin"],
      ["bia", "timeoutLoss"],
    ]);
    // Quem saiu por conta própria não gera aviso de prazo.
    expect(
      noticesFor(before, { ...after, endedBy: "bia" }).map((n) => n.kind),
    ).toEqual([]);
  });
  it("textos em português e inglês", () => {
    const notice = {
      uid: "gil",
      kind: "turn" as const,
      code: "ABC234",
      rival: "Bia",
    };
    expect(messageFor(notice, "pt")).toEqual({
      title: "Sua vez no WordQuest!",
      body: "Bia jogou. Faça sua jogada (você tem 48 h).",
    });
    expect(messageFor(notice, "en").title).toBe("Your turn in WordQuest!");
    expect(
      messageFor({ ...notice, kind: "finished", result: "win" }, "pt").title,
    ).toBe("Você venceu!");
  });
  it("checagem de hora em hora: prazo vencido, lembrete uma vez por jogada e espera expirada", () => {
    const r = room({ rev: 4 }, "p");
    const deadline = 1_000 + TURN_DEADLINE_MS;
    expect(sweepAction(r, 2_000, undefined)).toEqual({ kind: "none" });
    const remind = sweepAction(r, deadline - REMIND_BEFORE_MS + 1, undefined);
    expect(remind).toMatchObject({
      kind: "remind",
      notice: { uid: "gil", kind: "remind", rival: "Bia" },
    });
    expect(sweepAction(r, deadline - REMIND_BEFORE_MS + 1, 4)).toEqual({
      kind: "none",
    });
    expect(sweepAction(r, deadline + 1, 4)).toEqual({
      kind: "timeout",
      loser: "gil",
    });
    expect(
      sweepAction(
        room({ status: "waiting", guest: undefined }),
        deadline + 1,
        undefined,
      ),
    ).toEqual({ kind: "expire" });
    expect(
      sweepAction(room({ status: "finished" }), deadline + 1, undefined),
    ).toEqual({
      kind: "none",
    });
  });
  it("chave do token sem caracteres proibidos no banco", () => {
    expect(tokenKey("a.b#c$d[e]f/g:h_i-j")).toBe("a_b_c_d_e_f_g:h_i-j");
  });
});
