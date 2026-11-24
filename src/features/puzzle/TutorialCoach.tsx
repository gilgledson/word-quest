import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Pointer } from "lucide-react";
import type { Tile } from "../../game/crossword-engine";
import type { GuidedState } from "./tutorialPick";
import { complementRects, padBox, unionBox, type Box } from "./coachGeometry";
import { coachText as t } from "../../i18n/tutorial";

interface Props {
  guide: GuidedState;
  /** A palavra guiada por extenso (ex.: "JOGO"). */
  word: string;
  /** Peças do banco agora (a mãozinha procura uma com a próxima letra). */
  rack: Tile[];
  /** Pontos reais do ✓ quando a palavra está inteira (prévia do motor). */
  gained?: number;
  /** Animações ligadas e sem "reduzir movimento". */
  animated: boolean;
  /** Dedo apertado numa peça: a mãozinha sai do caminho. */
  pressing: boolean;
  onSkip: () => void;
}
type Geo = {
  w: number;
  h: number;
  word?: Box;
  bank?: Box;
  confirm?: Box;
  next?: Box;
  tile?: Box;
};
const PAD = 6;
const boxOf = (selector: string): Box | undefined => {
  const el = document.querySelector(selector);
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return r.width && r.height
    ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    : undefined;
};
const center = (b: Box) => ({
  x: (b.left + b.right) / 2,
  y: (b.top + b.bottom) / 2,
});

/**
 * Primeira jogada guiada do tutorial: escurece a tela, deixa livres só as casas da palavra e o
 * banco (depois, o ✓) e mostra com uma mãozinha qual letra levar para qual casa. Os toques fora
 * dos recortes são barrados por uma camada própria; a regra de verdade (só a palavra guiada, só a
 * letra certa) fica na partida, então o escuro é só apresentação.
 */
export function TutorialCoach({
  guide,
  word,
  rack,
  gained,
  animated,
  pressing,
  onSkip,
}: Props) {
  const confirmStep = guide.complete;
  const nextTile =
    !confirmStep && guide.next
      ? rack.find((t) => !t.joker && t.letter === guide.next!.letter)
      : undefined;
  const [geo, setGeo] = useState<Geo | null>(null);
  // Altura do balão, para escolher onde ele cabe sem cobrir a palavra.
  const bubble = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(150);
  // Remede quando o conteúdo do balão muda (passo, contador) ou a tela muda de tamanho.
  useLayoutEffect(() => {
    const h = bubble.current?.offsetHeight;
    if (h) setBubbleH(h);
  }, [confirmStep, guide.filled, geo?.w, geo?.h]);
  const measure = useCallback(() => {
    const cells = guide.cells
      .map((c) => boxOf(`.board [data-cell="${c.key}"]`))
      .filter((b): b is Box => !!b);
    setGeo({
      w: window.innerWidth,
      h: window.innerHeight,
      word: unionBox(cells),
      bank: boxOf(".letter-bank"),
      confirm: boxOf(".confirm-button"),
      next: guide.next && boxOf(`.board [data-cell="${guide.next.key}"]`),
      tile: nextTile && boxOf(`.letter-bank [data-tile="${nextTile.id}"]`),
    });
  }, [guide.cells, guide.next, nextTile]);
  // Mede já e de novo sempre que algo pode ter mudado de lugar: tamanho da tela, rotação, rolagem,
  // grade e banco (inclusive a entrada animada das peças, por isso as medidas atrasadas).
  useLayoutEffect(() => {
    measure();
    const later = [200, 600, 1200].map((ms) => window.setTimeout(measure, ms));
    const ro =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => measure());
    for (const sel of [".board", ".letter-bank", ".puzzle-tools"]) {
      const el = document.querySelector(sel);
      if (el) ro?.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      later.forEach((t) => window.clearTimeout(t));
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, guide.filled, rack.length]);
  // Sem medida ainda (ou grade fora da tela): só o balão, sem escurecer nada.
  const holes = (
    confirmStep ? [geo?.word, geo?.confirm] : [geo?.word, geo?.bank]
  )
    .filter((b): b is Box => !!b)
    .map((b) => padBox(b, PAD, geo!.w, geo!.h));
  const blocks =
    geo && holes.length ? complementRects(geo.w, geo.h, holes) : [];
  // Balão encostado acima do banco (ou do ✓), dentro da tela.
  const anchor = confirmStep ? geo?.confirm : geo?.bank;
  const from = geo?.tile && center(geo.tile);
  const to = geo?.next && center(geo.next);
  const tap = confirmStep && geo?.confirm && center(geo.confirm);
  const showHand = !pressing && (tap || (from && to));
  // A mãozinha some no gesto e volta depois de uma pausa (sem competir com o dedo).
  const [handKey, setHandKey] = useState(0);
  useEffect(() => {
    if (!pressing) setHandKey((k) => k + 1);
  }, [pressing, guide.filled]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="coach" data-step={confirmStep ? "confirm" : "word"}>
      {geo && (
        <svg
          className="coach-dim"
          width={geo.w}
          height={geo.h}
          aria-hidden="true"
        >
          <defs>
            <mask id="coach-mask">
              <rect width={geo.w} height={geo.h} fill="white" />
              {holes.map((b, i) => (
                <rect
                  key={i}
                  x={b.left}
                  y={b.top}
                  width={b.right - b.left}
                  height={b.bottom - b.top}
                  rx={14}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            width={geo.w}
            height={geo.h}
            fill="rgba(8, 24, 52, 0.74)"
            mask="url(#coach-mask)"
          />
        </svg>
      )}
      {blocks.map((b, i) => (
        <div
          key={i}
          className="coach-block"
          data-testid="coach-block"
          style={{
            left: b.left,
            top: b.top,
            width: b.right - b.left,
            height: b.bottom - b.top,
          }}
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        />
      ))}
      {!confirmStep && geo?.next && (
        <span
          className={`coach-ring ${animated ? "pulse" : ""}`}
          style={ringStyle(geo.next)}
          aria-hidden="true"
        />
      )}
      {!confirmStep && geo?.tile && (
        <span
          className={`coach-ring tile ${animated ? "pulse" : ""}`}
          style={ringStyle(geo.tile)}
          aria-hidden="true"
        />
      )}
      {showHand && (
        <motion.span
          key={handKey}
          className="coach-hand"
          aria-hidden="true"
          initial={false}
          style={{ left: 0, top: 0 }}
          animate={
            tap
              ? {
                  x: tap.x,
                  y: tap.y,
                  scale: animated ? [1, 0.82, 1] : 1,
                  opacity: 1,
                }
              : animated
                ? {
                    x: [from!.x, from!.x, to!.x, to!.x],
                    y: [from!.y, from!.y, to!.y, to!.y],
                    opacity: [0, 1, 1, 0],
                  }
                : { x: from!.x, y: from!.y, opacity: 1 }
          }
          transition={
            animated
              ? {
                  duration: tap ? 0.9 : 1.6,
                  times: tap ? undefined : [0, 0.15, 0.8, 1],
                  repeat: Infinity,
                  repeatDelay: 1.8,
                  delay: 0.6,
                }
              : { duration: 0 }
          }
        >
          <Pointer size={34} strokeWidth={2.2} />
        </motion.span>
      )}
      <div
        className="coach-bubble"
        role="region"
        aria-label={t.region}
        aria-live="polite"
        ref={bubble}
        style={bubbleStyle(geo, anchor, geo?.word, bubbleH)}
      >
        {confirmStep ? (
          <>
            <b>{t.complete}</b>
            <p>
              {t.tapConfirm}
              {gained ? (
                <>
                  : <strong>{t.points(gained)}</strong>
                </>
              ) : null}
              .
            </p>
          </>
        ) : (
          <>
            <b>{t.firstWord}</b>
            <p>
              {t.dragBefore}
              <strong>{word}</strong>
              {t.dragAfter}
            </p>
            <p className="coach-progress">
              {guide.next && (
                <span>
                  {t.nextLetter}
                  <strong>{guide.next.letter}</strong>
                </span>
              )}
              <span>{t.progress(guide.filled, guide.cells.length)}</span>
            </p>
          </>
        )}
        <button type="button" className="coach-skip" onClick={onSkip}>
          {t.skip}
        </button>
      </div>
    </div>,
    document.body,
  );
}
function ringStyle(b: Box) {
  return {
    left: b.left - 3,
    top: b.top - 3,
    width: b.right - b.left + 6,
    height: b.bottom - b.top + 6,
  };
}
/**
 * Onde o balão cabe sem cobrir a palavra: acima do banco (ou do ✓), abaixo da palavra, acima dela
 * ou, sem lugar melhor, no alto da tela. Na horizontal fica sobre a coluna da área destacada.
 */
function bubbleStyle(
  geo: Geo | null,
  anchor: Box | undefined,
  word: Box | undefined,
  height: number,
) {
  if (!geo || !anchor) return { left: 12, right: 12, bottom: 16 };
  const width = Math.min(340, geo.w - 24);
  const mid = (anchor.left + anchor.right) / 2;
  const left = Math.max(12, Math.min(geo.w - width - 12, mid - width / 2));
  const GAP = 12;
  const clear = (top: number) =>
    top >= 8 &&
    top + height <= geo.h - 8 &&
    (!word ||
      left + width <= word.left ||
      left >= word.right ||
      top >= word.bottom + 8 ||
      top + height <= word.top - 8);
  const options = [
    anchor.top - GAP - height,
    word ? word.bottom + GAP : -1,
    word ? word.top - GAP - height : -1,
  ];
  const top =
    options.find((t) => clear(t) && t + height <= anchor.top - 4) ??
    options.find(clear) ??
    8;
  return { left, width, top };
}
