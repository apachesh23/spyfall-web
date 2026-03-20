'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PrimaryButtonLobby } from '@/components/ui/PrimaryButtonLobby';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from './SpyGuessLocationModal.module.css';

export type SpyGuessLocationModalProps = {
  open: boolean;
  onClose: () => void;
  onGuess?: (value: string) => void;
  /** Звуки для действий (по умолчанию как в ConfirmDialog) */
  soundClick?: UISoundId;
  soundHover?: UISoundId;
};

export function SpyGuessLocationModal({
  open,
  onClose,
  onGuess,
  soundClick = 'click',
  soundHover = 'hover',
}: SpyGuessLocationModalProps) {
  const [value, setValue] = useState('');
  const [hasError, setHasError] = useState(false);

  const handleGuess = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      playUI('wrong');
      setHasError(true);
      return;
    }

    if (soundClick) playUI(soundClick);
    onGuess?.(trimmed);
    setValue('');
    setHasError(false);
    onClose();
  }, [value, onGuess, onClose, soundClick]);

  const handleCancel = useCallback(() => {
    if (soundClick) playUI(soundClick);
    setValue('');
    setHasError(false);
    onClose();
  }, [onClose, soundClick]);

  const handleBackdropClick = useCallback(() => {
    if (soundClick) playUI(soundClick);
    onClose();
  }, [onClose, soundClick]);

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setValue('');
      setHasError(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Угадать локацию"
        >
          {/* Зона для закрытия по клику вне карточки */}
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
            <div className={styles.header}>
              <h2 className={styles.title}>Назовите локацию</h2>
              <p className={styles.hint}>
                У тебя есть только одна попытка. В случае ошибки угадать снова не получится.
              </p>
            </div>

            <div className={styles.inputWrap}>
              <input
                id="spy-guess-input"
                type="text"
                className={`glass-input ${styles.input} ${hasError ? styles.inputError : ''}`}
                placeholder="Введите название локации..."
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (hasError) setHasError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGuess();
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
                autoComplete="off"
              />
            </div>
            
            <div className={styles.actions}>
              <PrimaryButtonLobby
                className={styles.btnGuessOverride}
                noIcon
                onClick={handleGuess}
                soundClick={soundClick}
                soundHover={soundHover}
              >
                Угадать
              </PrimaryButtonLobby>
              
              <button
                type="button"
                className={`glass glass-hover ${styles.btnCancel}`}
                onClick={handleCancel}
                onMouseEnter={() => soundHover && playUI(soundHover)}
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}