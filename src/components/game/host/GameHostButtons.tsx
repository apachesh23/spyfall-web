'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlayerPause, IconPlayerPlay, IconFlagFilled } from '@tabler/icons-react';
import { playUI } from '@/lib/sound';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from './GameHostButtons.module.css';

type GameHostButtonsProps = {
  onPause: () => void;
  onEndGame: () => void;
  isPaused: boolean;
  pausingGame: boolean;
};

/** Две кнопки ведущего в стиле TopBar: Пауза и Завершить игру. Фикс слева 20px. */
export function GameHostButtons({
  onPause,
  onEndGame,
  isPaused,
  pausingGame,
}: GameHostButtonsProps) {
  const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);

  return (
    <>
      <div className={styles.wrap}>
        <motion.button
          type="button"
          className={`${styles.iconButton} glass glass-hover`}
          onClick={() => {
            playUI('click');
            onPause();
          }}
          onMouseEnter={() => playUI('hover')}
          disabled={pausingGame || isPaused}
          aria-label={isPaused ? 'На паузе' : 'Пауза'}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.08 }}
        >
          <span className={styles.icon} aria-hidden>
            <AnimatePresence initial={false}>
              <motion.span
                key={isPaused ? 'play' : 'pause'}
                className={styles.iconLayer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isPaused ? (
                  <IconPlayerPlay size={28} stroke={2} />
                ) : (
                  <IconPlayerPause size={28} stroke={2} />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
        <motion.button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonEnd} glass glass-hover`}
          onClick={() => {
            playUI('click');
            setEndGameDialogOpen(true);
          }}
          onMouseEnter={() => playUI('hover')}
          aria-label="Завершить игру"
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.08 }}
        >
          <span className={styles.icon} aria-hidden>
            <IconFlagFilled size={28} stroke={2} />
          </span>
        </motion.button>
      </div>

      <ConfirmDialog
        open={endGameDialogOpen}
        onClose={() => setEndGameDialogOpen(false)}
        question="Вы хотите завершить игру?"
        onConfirm={onEndGame}
      />
    </>
  );
}
