'use client';

import { motion } from 'framer-motion';
import styles from './LoadingDots.module.css';

const DOT_COUNT = 3;
const BLUE = '#747BFF';

export function LoadingDots() {
  return (
    <span className={styles.wrap} aria-hidden>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <motion.span
          key={i}
          className={styles.dot}
          style={{ backgroundColor: BLUE }}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}
