'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { DangerButtonLobby } from '@/components/ui/DangerButtonLobby';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from './ConfirmDialog.module.css';

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Текст вопроса по центру */
  question: string;
  /** Вызывается при нажатии «Да» (перед закрытием) */
  onConfirm: () => void;
  /** Звуки для кнопок */
  soundClick?: UISoundId;
  soundHover?: UISoundId;
};

export function ConfirmDialog({
  open,
  onClose,
  question,
  onConfirm,
  soundClick = 'click',
  soundHover = 'hover',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    if (soundClick) playUI(soundClick);
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (soundClick) playUI(soundClick);
    onClose();
  };

  const handleBackdropClick = () => {
    if (soundClick) playUI(soundClick);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className={styles.closeArea}
            onClick={handleBackdropClick}
            aria-hidden
          />
          <motion.div
            className={`glass ${styles.card}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.question}>{question}</p>
            <div className={styles.actions}>
              <DangerButtonLobby
                className={styles.btnYes}
                hideIcon
                onClick={handleConfirm}
                soundClick={soundClick}
                soundHover={soundHover}
              >
                Да
              </DangerButtonLobby>
              <button
                type="button"
                className={`glass glass-hover ${styles.btnNo}`}
                onClick={handleCancel}
                onMouseEnter={() => soundHover && playUI(soundHover)}
              >
                Нет
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
