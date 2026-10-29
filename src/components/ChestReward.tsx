import { motion } from "motion/react";
import { CoinIcon } from "./CoinIcon";

/** Baú do mundo aberto ao vencer o chefe: balança, abre e solta moedas (parado se as animações estiverem desligadas). */
export function ChestReward({
  coins,
  animated,
}: {
  coins: number;
  animated: boolean;
}) {
  return (
    <div className="chest-reward" role="status">
      <div className="chest-stage" aria-hidden="true">
        <motion.span
          className="game-art art-chest chest-sprite"
          initial={animated ? { scale: 0.5, opacity: 0 } : false}
          animate={
            animated
              ? {
                  scale: [0.5, 1.2, 1],
                  rotate: [0, -10, 10, -6, 6, 0],
                  opacity: 1,
                }
              : undefined
          }
          transition={{ duration: 0.9 }}
        />
        {animated &&
          Array.from({ length: 7 }, (_, i) => (
            <motion.span
              key={i}
              className="chest-coin"
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -56 - (i % 3) * 14,
                x: (i - 3) * 14,
                scale: [0.4, 1, 1, 0.8],
              }}
              transition={{ duration: 1.1, delay: 0.55 + i * 0.07 }}
            >
              <CoinIcon size={16} />
            </motion.span>
          ))}
      </div>
      <span className="chest-title">Baú do mundo aberto!</span>
      <b className="chest-prize">
        <CoinIcon size={18} /> +{coins} moedas
      </b>
    </div>
  );
}
