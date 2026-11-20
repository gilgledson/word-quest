import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import {
  BURST_MS,
  TRAIL_MS,
  type ScoreFloat,
  type ScoreTrail,
  type WordBurst,
} from "./useScoreFloats";

/**
 * "+N" com algarismos 3D dourados (um arquivo por caractere, gerados no ChatGPT:
 * docs/referencias/numeros-3d-chatgpt.png). O valor fica no aria-label de quem usa.
 */
function Number3D({ value }: { value: number }) {
  return (
    <span className="word-burst-number" aria-hidden="true">
      {["mais", ...String(value)].map((ch, i) => (
        <img
          key={i}
          src={`/art/resultado/numeros/${ch}.webp`}
          alt=""
          draggable={false}
        />
      ))}
    </span>
  );
}

/**
 * Pontos da jogada sobre o tabuleiro (ver `useScoreFloats`): "+N" das letras soltas, o selo
 * "Palavra completa! +N" com raios e confetes, e as estrelas que voam até o placar.
 */
export function ScoreFloats({
  floats,
  bursts = [],
  trails = [],
}: {
  floats: ScoreFloat[];
  bursts?: WordBurst[];
  trails?: ScoreTrail[];
}) {
  return (
    <>
      {floats.map((f) => (
        <motion.span
          key={f.id}
          className={`score-float ${f.kind}`}
          style={{ left: f.x, top: f.y }}
          aria-hidden="true"
          initial={{ opacity: 0, y: 10, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: -46, scale: [0.6, 1.3, 1, 1] }}
          transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
        >
          {f.text}
        </motion.span>
      ))}
      {bursts.map((b) => (
        <span
          key={b.id}
          className={`word-burst ${b.owner}`}
          style={{ left: b.x, top: b.y, scale: b.scale }}
          aria-hidden="true"
        >
          <motion.span
            className="word-burst-rays"
            initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.1, 1.15, 1.2],
              rotate: 40,
            }}
            transition={{
              duration: BURST_MS / 1000,
              times: [0, 0.2, 0.75, 1],
            }}
          />
          <motion.span
            className="word-burst-card"
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.15, 1, 0.85],
              y: [20, 0, 0, -24],
            }}
            transition={{
              duration: BURST_MS / 1000,
              times: [0, 0.18, 0.75, 1],
              ease: "easeOut",
            }}
          >
            {/* O "+N" grande em cima e a fita "PALAVRA COMPLETA!" embaixo (fita gerada no ChatGPT,
                docs/referencias/fita-pontos-chatgpt.png). */}
            <Number3D value={b.points} />
            <img
              src={`/art/resultado/fita-${b.owner === "p" ? "jogador" : "rival"}.webp`}
              alt=""
              draggable={false}
            />
          </motion.span>
        </span>
      ))}
      {trails.length > 0 &&
        createPortal(
          trails.map((t, i) => (
            <motion.span
              key={t.id}
              className={`score-trail ${t.owner}`}
              aria-hidden="true"
              style={{ left: t.from.x, top: t.from.y }}
              initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
              animate={{
                x: t.to.x - t.from.x,
                y: [0, (t.to.y - t.from.y) * 0.4 - 40, t.to.y - t.from.y],
                scale: [0.6, 1.2, 0.7],
                opacity: [0, 1, 1, 0.9],
              }}
              transition={{
                duration: TRAIL_MS / 1000,
                delay: (i % 4) * 0.07,
                ease: "easeIn",
              }}
            >
              <Star size={22} fill="currentColor" strokeWidth={1.5} />
            </motion.span>
          )),
          document.body,
        )}
    </>
  );
}
