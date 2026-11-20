import { useEffect, useState, type RefObject } from "react";
import { getParticles } from "../../animations/particles";

export interface ScoreFloat {
  id: number;
  text: string;
  x: number;
  y: number;
  kind: "p" | "ai" | "penalty" | "mult";
}
/** Selo "Palavra completa! +N" no meio da grade (docs/referencias/pontos-palavra-chatgpt.png). */
export interface WordBurst {
  id: number;
  points: number;
  owner: "p" | "ai";
  x: number;
  y: number;
  /** Escala do selo para caber no espaço livre acima ou abaixo da palavra. */
  scale: number;
}
/** Estrelas que voam da palavra até o placar de quem pontuou (coordenadas da tela). */
export interface ScoreTrail {
  id: number;
  owner: "p" | "ai";
  from: { x: number; y: number };
  to: { x: number; y: number };
}
let floatId = 0;
/** Tempo do selo inteiro; as estrelas saem no meio e chegam ao placar perto do fim. */
export const BURST_MS = 1500;
export const TRAIL_DELAY_MS = 700;
export const TRAIL_MS = 600;
const GOLD = 0xffd23c;
const PURPLE = 0xc9a2ff;
/**
 * Pontos da jogada sobre o tabuleiro:
 * - letras soltas: "+N" que sobe da casa e um brilho nela;
 * - palavra fechada: a palavra acende casa a casa, um selo grande "Palavra completa! +N" (o valor
 *   total da jogada) aparece no meio da grade e estrelas voam até o placar, que brilha quando elas
 *   chegam.
 */
export function useScoreFloats(
  cardRef: RefObject<HTMLElement | null>,
  animations: boolean,
) {
  // Baixa o PixiJS ao abrir a partida, para as partículas da primeira palavra não atrasarem.
  useEffect(() => {
    if (animations) void getParticles();
  }, [animations]);
  const [floats, setFloats] = useState<ScoreFloat[]>([]);
  const [bursts, setBursts] = useState<WordBurst[]>([]);
  const [trails, setTrails] = useState<ScoreTrail[]>([]);
  const [flash, setFlash] = useState<string[]>([]);
  /** Placar que brilha quando as estrelas chegam (a chave muda para repetir o brilho). */
  const [glow, setGlow] = useState<{ owner: "p" | "ai"; key: number }>();
  const rectsOf = (cells: string[]) => {
    const card = cardRef.current;
    return cells
      .map((k) =>
        card?.querySelector(`[data-cell="${k}"]`)?.getBoundingClientRect(),
      )
      .filter((r): r is DOMRect => !!r);
  };
  /** Centro das casas, em coordenadas do cartão do tabuleiro. */
  const centerOf = (cells: string[]) => {
    const box = cardRef.current?.getBoundingClientRect();
    const rects = rectsOf(cells);
    const x = rects.length
      ? rects.reduce((n, r) => n + r.left + r.width / 2, 0) / rects.length -
        (box?.left ?? 0)
      : (box?.width ?? 0) / 2;
    const y = rects.length
      ? rects.reduce((n, r) => n + r.top + r.height / 2, 0) / rects.length -
        (box?.top ?? 0)
      : (box?.height ?? 0) / 2;
    return { x, y };
  };
  const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
  /** Mostra "−N" sobre as casas das letras erradas devolvidas ao banco. */
  const popPenalty = (cells: string[], points: number) => {
    if (!animations || !cells.length || !points) return;
    const { x, y } = centerOf(cells);
    const made: ScoreFloat[] = [
      { id: ++floatId, text: `−${points}`, x, y, kind: "penalty" },
    ];
    setFloats((f) => [...f, ...made]);
    later(1100, () =>
      setFloats((f) => f.filter((x) => !made.some((m) => m.id === x.id))),
    );
  };
  /** Estrelas do meio da palavra até o placar de quem fez os pontos. */
  const flyToScore = (cells: string[], owner: "p" | "ai") => {
    const target = document
      .querySelector(
        `[data-testid="${owner === "p" ? "duelist-player" : "duelist-rival"}"] .duelist-score`,
      )
      ?.getBoundingClientRect();
    const rects = rectsOf(cells);
    if (!target || !rects.length) return;
    const from = {
      x: rects.reduce((n, r) => n + r.left + r.width / 2, 0) / rects.length,
      y: rects.reduce((n, r) => n + r.top + r.height / 2, 0) / rects.length,
    };
    const to = {
      x: target.left + target.width / 2,
      y: target.top + target.height / 2,
    };
    const glowNow = () => setGlow({ owner, key: ++floatId });
    void getParticles().then((fx) => {
      // Com PixiJS: estrelas com rastro de brilho; sem WebGL, as estrelas do motion.
      if (fx) {
        later(TRAIL_DELAY_MS, () =>
          fx.fly(from, to, owner === "p" ? GOLD : PURPLE, glowNow),
        );
        return;
      }
      const made: ScoreTrail[] = [0, 1, 2, 3].map(() => ({
        id: ++floatId,
        owner,
        from,
        to,
      }));
      later(TRAIL_DELAY_MS, () => setTrails((t) => [...t, ...made]));
      later(TRAIL_DELAY_MS + TRAIL_MS, glowNow);
      later(TRAIL_DELAY_MS + TRAIL_MS + 400, () =>
        setTrails((t) => t.filter((x) => !made.some((m) => m.id === x.id))),
      );
    });
  };
  /** Brilhos saindo das casas e, na palavra fechada, confete no selo (só com PixiJS). */
  const particlesAt = (
    cells: string[],
    owner: "p" | "ai",
    confettiAt?: { x: number; y: number; spread: number },
  ) => {
    const rects = rectsOf(cells);
    void getParticles().then((fx) => {
      if (!fx) return;
      fx.sparkle(rects, owner === "p" ? GOLD : PURPLE);
      if (confettiAt)
        later(120, () => fx.confetti(confettiAt, confettiAt.spread));
    });
  };
  /**
   * Pontos de uma jogada. `points` são as letras novas e `bonus` o resto das palavras que ela fechou;
   * com palavra fechada (`wordCells`, na ordem das casas) o selo mostra o total, `points + bonus`.
   */
  const popScore = (
    cells: string[],
    points: number,
    bonus: number,
    owner: "p" | "ai",
    wordCells: string[] = [],
  ) => {
    if (!animations || !cells.length) return;
    const closed = wordCells.length > 0;
    // A palavra acende na ordem das casas (o atraso vem da posição na lista).
    const lit = closed ? [...new Set([...wordCells, ...cells])] : cells;
    setFlash((f) => [...f.filter((k) => !lit.includes(k)), ...lit]);
    later(closed ? 1300 : 1100, () =>
      setFlash((f) => f.filter((k) => !lit.includes(k))),
    );
    if (closed) {
      const card = cardRef.current?.getBoundingClientRect();
      const { y } = centerOf(wordCells);
      // O número com a fita (≈ 115 px de altura) vai para o lado da palavra com mais espaço
      // (embaixo ou em cima), sem cobri-la, e encolhe se o espaço for menor que ele.
      const height = card?.height ?? 0;
      // Meia-altura com folga para o "pulo" de entrada (sobe a 115%).
      const half = 68;
      const cell = (rectsOf(wordCells)[0]?.height ?? 60) / 2 + 4;
      const below = height - (y + cell);
      const above = y - cell;
      const room = Math.max(below, above);
      const scale = Math.max(0.55, Math.min(1, room / (2 * half)));
      const burst: WordBurst = {
        id: ++floatId,
        points: points + bonus,
        owner,
        x: (card?.width ?? 0) / 2,
        y: below >= above ? y + cell + half * scale : y - cell - half * scale,
        scale,
      };
      setBursts((b) => [...b, burst]);
      later(BURST_MS, () =>
        setBursts((b) => b.filter((x) => x.id !== burst.id)),
      );
      particlesAt(wordCells, owner, {
        x: (card?.left ?? 0) + burst.x,
        y: (card?.top ?? 0) + burst.y,
        spread: 95 * burst.scale,
      });
      flyToScore(wordCells, owner);
      return;
    }
    particlesAt(cells, owner);
    const { x, y } = centerOf(cells);
    const made: ScoreFloat[] = [
      { id: ++floatId, text: `+${points + bonus}`, x, y, kind: owner },
    ];
    setFloats((f) => [...f, ...made]);
    later(1100, () =>
      setFloats((f) => f.filter((x) => !made.some((m) => m.id === x.id))),
    );
  };
  /** "×2"/"×3" saltando das casas especiais que acabaram de pontuar. */
  const popMultipliers = (cells: string[], bonus: Record<string, number>) => {
    if (!animations) return;
    const made: ScoreFloat[] = cells
      .filter((k) => bonus[k])
      .map((k) => {
        const { x, y } = centerOf([k]);
        return {
          id: ++floatId,
          text: `×${bonus[k]}`,
          x,
          y: y - 26,
          kind: "mult",
        };
      });
    if (!made.length) return;
    setFloats((f) => [...f, ...made]);
    later(1100, () =>
      setFloats((f) => f.filter((x) => !made.some((m) => m.id === x.id))),
    );
  };
  return {
    floats,
    bursts,
    trails,
    flash,
    glow,
    popScore,
    popPenalty,
    popMultipliers,
  };
}
