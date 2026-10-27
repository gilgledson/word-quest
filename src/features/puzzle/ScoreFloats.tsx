import { motion } from "motion/react";
import type { ScoreFloat } from "./useScoreFloats";

export function ScoreFloats({ floats }: { floats: ScoreFloat[] }) {
  return floats.map((f) => (
    <motion.span
      key={f.id}
      className={`score-float ${f.kind}`}
      style={{ left: f.x, top: f.y }}
      aria-hidden="true"
      initial={{ opacity: 0, y: 10, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], y: -46, scale: [0.6, 1.2, 1, 1] }}
      transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
    >
      {f.text}
    </motion.span>
  ));
}
