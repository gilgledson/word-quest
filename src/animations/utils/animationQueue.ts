import { WORD_STAGGER } from "../animation.config";
import type { ActiveEffect, AnimationEvent } from "../animation.types";

type Listener = (active: ActiveEffect[]) => void;

/**
 * Fila dos efeitos em exibição. Ignora eventos já tocados (por id), escalona os contornos de
 * palavras fechadas na mesma jogada e remove cada efeito por timer próprio. Nada aqui bloqueia o
 * jogo: `settle` encerra efeitos na hora e `dispose` limpa todos os timers.
 */
export class AnimationQueue {
  private seen = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private listeners = new Set<Listener>();
  active: ActiveEffect[] = [];

  constructor(private stagger = WORD_STAGGER) {}

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l(this.active);
  }

  /** Enfileira eventos novos; devolve os que realmente entraram. */
  push(
    events: AnimationEvent[],
    durationOf: (event: AnimationEvent) => number,
  ) {
    const fresh = events.filter((e) => !this.seen.has(e.id));
    if (!fresh.length) return [];
    let words = 0;
    const added = fresh.map((event) => {
      this.seen.add(event.id);
      const delay =
        event.type === "WORD_COMPLETED" ? words++ * this.stagger : 0;
      return { event, delay, duration: durationOf(event) } as ActiveEffect;
    });
    this.active = [...this.active, ...added];
    for (const effect of added) {
      const timer = setTimeout(
        () => {
          this.timers.delete(timer);
          this.active = this.active.filter((a) => a !== effect);
          this.emit();
        },
        effect.delay + effect.duration + 60,
      );
      this.timers.add(timer);
    }
    this.emit();
    return added.map((a) => a.event);
  }

  /** Encerra já os efeitos dos tipos indicados (ou todos), sem esperar o fim. */
  settle(...types: AnimationEvent["type"][]) {
    const keep = this.active.filter(
      (a) => types.length > 0 && !types.includes(a.event.type),
    );
    if (keep.length === this.active.length) return;
    this.active = keep;
    this.emit();
  }

  /** Limpa timers e efeitos; a fila continua utilizável (StrictMode monta duas vezes). */
  dispose() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.active = [];
  }
}
