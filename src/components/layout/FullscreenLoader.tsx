'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from './Logo';
import styles from './FullscreenLoader.module.css';

type FullscreenLoaderProps = {
  show: boolean;
};

export function FullscreenLoader({ show }: FullscreenLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.inner}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            {/* База — полупрозрачный логотип */}
            <div className={styles.logoBase}>
              <Logo height={48} />
            </div>
            {/* Слой заполнения, который "проявляет" логотип слева направо */}
            <motion.div
              className={styles.logoOverlay}
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 2.0, ease: [0.4, 0, 0.2, 1] }}
            >
              <Logo height={48} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

