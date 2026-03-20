'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LottieIcon } from './LottieIcon';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from './DangerButtonLobby.module.css';

type DangerButtonLobbyProps = {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Компактный вариант (для мобильного хедера) */
  compact?: boolean;
  /** Скрыть Lottie-иконку (например в модалке подтверждения) */
  hideIcon?: boolean;
  soundClick?: UISoundId;
  soundHover?: UISoundId;
};

export function DangerButtonLobby({
  onClick,
  disabled = false,
  children,
  className = '',
  compact = false,
  hideIcon = false,
  soundClick,
  soundHover,
}: DangerButtonLobbyProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (!disabled && soundClick) playUI(soundClick);
        onClick?.();
      }}
      disabled={disabled}
      onMouseEnter={() => {
        setHovered(true);
        if (!disabled && soundHover) playUI(soundHover);
      }}
      onMouseLeave={() => setHovered(false)}
      className={`${styles.button} ${compact ? styles.buttonCompact : ''} ${className}`}
      whileHover={
        disabled
          ? undefined
          : {
              filter: 'brightness(1.08)',
            }
      }
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.97,
              filter: 'brightness(0.93)',
            }
      }
      transition={{ duration: 0.08 }}
    >
      {children}
      {!hideIcon && (
        <motion.span
          className={styles.icon}
          aria-hidden
          initial={false}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <LottieIcon
            src="/lottie/exit.json"
            playOnHover
            hovered={hovered}
          />
        </motion.span>
      )}
    </motion.button>
  );
}
