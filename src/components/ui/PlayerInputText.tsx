'use client';

import { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { playUI } from '@/lib/sound';
import styles from './PlayerInputText.module.css';

type PlayerInputLayout = 'auth' | 'lobby' | 'code';

type PlayerInputTextProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  error?: boolean;
  /** Триггер для повторного запуска shake (можно инкрементировать при показе ошибки) */
  shakeTrigger?: number;
  className?: string;
  /** Семантический вариант инпута: влияет на пропорции через CSS‑переменные */
  layout?: PlayerInputLayout;
};

export function PlayerInputText({
  value,
  onChange,
  placeholder = 'Ваше имя',
  maxLength = 20,
  disabled = false,
  error = false,
  shakeTrigger: _shakeTrigger = 0,
  className = '',
  layout = 'auth',
}: PlayerInputTextProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (error) {
      controls.start({
        x: [0, -6, 6, -4, 4, -2, 2, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      });
      return;
    }
    controls.start({ x: 0, transition: { duration: 0.15, ease: 'easeInOut' } });
  }, [error, _shakeTrigger, controls]);

  return (
    <div className={`${styles.root} ${className}`}>
      <motion.div
        className={`${styles.inner} glass-input ${error ? styles.innerError : ''} ${
          error ? 'glass-input--no-glare' : ''
        }`}
        initial={{ x: 0 }}
        animate={controls}
      >
        <input
          type="text"
          inputMode={layout === 'code' ? 'numeric' : undefined}
          pattern={layout === 'code' ? '[0-9]*' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => playUI('click')}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          data-layout={layout}
          className={`${styles.field} ${error ? styles.fieldError : ''}`}
          aria-label={placeholder}
          aria-invalid={error}
        />
        <span className={styles.counter} aria-hidden>
          {value.length}/{maxLength}
        </span>
      </motion.div>
    </div>
  );
}

