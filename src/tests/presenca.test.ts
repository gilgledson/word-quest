import { afterEach, describe, expect, it, vi } from "vitest";

/** Firebase de mentira: guarda os ouvintes de cada caminho e o que foi gravado ou apagado. */
const fb = vi.hoisted(() => {
  const listeners = new Map<
    string,
    ((snap: { val: () => unknown }) => void)[]
  >();
  const log: string[] = [];
  return {
    listeners,
    log,
    fire(path: string, value: unknown) {
      for (const l of listeners.get(path) ?? []) l({ val: () => value });
    },
  };
});
vi.mock("../services/firebaseApp", () => ({ firebaseApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  signInAnonymously: async () => ({ user: { uid: "eu" } }),
}));
vi.mock("firebase/database", () => ({
  getDatabase: () => ({}),
  ref: (_db: unknown, path: string) => ({ path }),
  onValue: (
    r: { path: string },
    cb: (snap: { val: () => unknown }) => void,
  ) => {
    fb.listeners.set(r.path, [...(fb.listeners.get(r.path) ?? []), cb]);
    return () =>
      fb.listeners.set(
        r.path,
        (fb.listeners.get(r.path) ?? []).filter((x) => x !== cb),
      );
  },
  onDisconnect: (r: { path: string }) => ({
    remove: async () => void fb.log.push(`onDisconnect.remove ${r.path}`),
    cancel: async () => void fb.log.push(`onDisconnect.cancel ${r.path}`),
  }),
  set: async (r: { path: string }, v: unknown) =>
    void fb.log.push(`set ${r.path} ${String(v)}`),
  remove: async (r: { path: string }) => void fb.log.push(`remove ${r.path}`),
  get: vi.fn(),
  update: vi.fn(),
  runTransaction: vi.fn(),
}));

import { firebaseBackend } from "../services/onlineFirebase";

const flush = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => {
  fb.listeners.clear();
  fb.log.length = 0;
});

describe("presença no duelo ao vivo (Firebase)", () => {
  it("grava a presença a cada reconexão: quem volta depois de uma queda aparece online de novo", async () => {
    const seen: string[][] = [];
    const stop = firebaseBackend().presence("ABC234", "eu", (u) =>
      seen.push(u),
    );
    const mine = "rooms/ABC234/online/eu";
    // Conectou: registra a remoção para quando cair e grava a presença.
    fb.fire(".info/connected", true);
    await flush();
    expect(fb.log).toEqual([`onDisconnect.remove ${mine}`, `set ${mine} true`]);
    // Caiu (o servidor apaga a presença) e voltou: grava de novo.
    fb.fire(".info/connected", false);
    fb.fire(".info/connected", true);
    await flush();
    expect(fb.log.filter((l) => l === `set ${mine} true`)).toHaveLength(2);
    // A lista de quem está na sala chega pelo ouvinte da sala.
    fb.fire("rooms/ABC234/online", { eu: true, amigo: true });
    expect(seen.at(-1)).toEqual(["eu", "amigo"]);
    // Sair da tela: para de ouvir, cancela a remoção pendente e apaga a presença.
    stop();
    await flush();
    expect(fb.log).toContain(`onDisconnect.cancel ${mine}`);
    expect(fb.log.at(-1)).toBe(`remove ${mine}`);
    fb.fire(".info/connected", true);
    await flush();
    expect(fb.log.filter((l) => l === `set ${mine} true`)).toHaveLength(2);
  });
});
