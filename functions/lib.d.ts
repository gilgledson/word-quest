/** Tipos das regras das notificações (functions/lib.js), para os testes em TypeScript. */
export interface Notice {
  uid: string;
  kind: "turn" | "remind" | "finished" | "timeoutWin" | "timeoutLoss";
  code: string;
  rival: string;
  result?: "win" | "draw" | "loss";
}
type Room = Record<string, unknown> | null | undefined;
export const TURN_DEADLINE_MS: number;
export const REMIND_BEFORE_MS: number;
export const ROOM_EXPIRE_MS: number;
export const ROOM_TIMEOUT: string;
export const ROOM_EXPIRED: string;
export function turnUid(room: Room): string | undefined;
export function noticesFor(before: Room, after: Room): Notice[];
export function messageFor(
  notice: Notice,
  lang: string | undefined,
): { title: string; body: string };
export function sweepAction(
  room: Room,
  now: number,
  remindedRev: number | undefined,
):
  | { kind: "none" | "expire" }
  | { kind: "timeout"; loser: string }
  | { kind: "remind"; notice: Notice };
export function tokenKey(token: string): string;
