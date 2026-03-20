'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from '@/components/ui/PrimaryButton.module.css';

type SpyActionButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  lottieIcon?: string;
  /** Без иконки — текст центрируется */
  noIcon?: boolean;
  children: React.ReactNode;
  className?: string;
  soundClick?: UISoundId;
  soundHover?: UISoundId;
};

function SpinnerIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#734517"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      style={{ display: 'block' }}
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="42 24" strokeDashoffset="0" />
    </svg>
  );
}

export function SpyActionButton({
  onClick,
  disabled = false,
  loading = false,
  lottieIcon,
  noIcon = false,
  children,
  className = '',
  soundClick,
  soundHover,
}: SpyActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (!isDisabled && soundClick) playUI(soundClick);
        onClick?.();
      }}
      disabled={isDisabled}
      onMouseEnter={() => {
        setHovered(true);
        if (!isDisabled && soundHover) playUI(soundHover);
      }}
      onMouseLeave={() => setHovered(false)}
      className={`${styles.button} ${styles.buttonLobby} ${noIcon ? styles.buttonNoIcon : ''} ${className}`}
      whileHover={
        isDisabled
          ? undefined
          : {
              filter: 'brightness(1.08)',
            }
      }
      whileTap={
        isDisabled
          ? undefined
          : {
              scale: 0.97,
              filter: 'brightness(0.93)',
            }
      }
      transition={{ duration: 0.08 }}
    >
      {children}
      <span className={styles.icon} aria-hidden>
        {loading ? (
          <span className={styles.spinner}>
            <SpinnerIcon />
          </span>
        ) : lottieIcon ? (
          <LottieIcon src={lottieIcon} playOnHover hovered={hovered} />
        ) : null}
      </span>
    </motion.button>
  );
}

