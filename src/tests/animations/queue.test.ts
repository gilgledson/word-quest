import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORD_STAGGER } from "../../animations/animation.config";
import type { AnimationEvent } from "../../animations/animation.types";
import { AnimationQueue } from "../../animations/utils/animationQueue";

const word = (id: string, rev = 1): AnimationEvent => ({
  type: "WORD_COMPLETED",
  wordId: id,
  owner: "player",
  assisted: false,
  cells: [],
  id: `s#${rev}:WORD_COMPLETED:${id}`,
  sessionKey: "s",
  revision: rev,
});
const placed = (cell: string, rev = 1): AnimationEvent => ({
  type: "LETTER_PLACED",
  cellId: cell,
  id: `s#${rev}:LETTER_PLACED:${cell}`,
  sessionKey: "s",
  revision: rev,
});
const dur = (e: AnimationEvent) => (e.type === "WORD_COMPLETED" ? 1050 : 220);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("AnimationQueue", () => {
  it("ignora eventos com id já tocado e aceita o mesmo tipo em outra revisão", () => {
    const q = new AnimationQueue();
    expect(q.push([placed("1,1")], dur)).toHaveLength(1);
    expect(q.push([placed("1,1")], dur)).toHaveLength(0);
    expect(q.push([placed("1,1", 2)], dur)).toHaveLength(1);
    expect(q.active).toHaveLength(2);
  });
  it("escalona os contornos de duas palavras fechadas na mesma jogada", () => {
    const q = new AnimationQueue();
    q.push([word("a"), word("b")], dur);
    expect(q.active.map((a) => a.delay)).toEqual([0, WORD_STAGGER]);
  });
  it("remove cada efeito pelo próprio timer, e só depois da duração", () => {
    const q = new AnimationQueue();
    q.push([placed("1,1"), word("a")], dur);
    vi.advanceTimersByTime(300);
    expect(q.active.map((a) => a.event.type)).toEqual(["WORD_COMPLETED"]);
    vi.advanceTimersByTime(1000);
    expect(q.active).toHaveLength(0);
  });
  it("notifica quem assina a cada mudança e para depois de cancelar a assinatura", () => {
    const q = new AnimationQueue();
    const seen: number[] = [];
    const off = q.subscribe((a) => seen.push(a.length));
    q.push([placed("1,1")], dur);
    vi.advanceTimersByTime(400);
    off();
    q.push([placed("1,2", 2)], dur);
    expect(seen).toEqual([1, 0]);
  });
  it("settle encerra na hora os tipos pedidos (ou todos), sem esperar", () => {
    const q = new AnimationQueue();
    q.push([placed("1,1"), word("a")], dur);
    q.settle("WORD_COMPLETED");
    expect(q.active.map((a) => a.event.type)).toEqual(["LETTER_PLACED"]);
    q.settle();
    expect(q.active).toHaveLength(0);
  });
  it("dispose limpa os timers pendentes e a fila continua utilizável", () => {
    const q = new AnimationQueue();
    q.push([word("a")], dur);
    expect(vi.getTimerCount()).toBe(1);
    q.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(q.active).toHaveLength(0);
    expect(q.push([word("b", 2)], dur)).toHaveLength(1);
  });
});
