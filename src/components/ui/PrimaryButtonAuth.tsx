'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LottieIcon } from './LottieIcon';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from './PrimaryButton.module.css';

type PrimaryButtonAuthLayout = 'auth' | 'vote';

type PrimaryButtonAuthProps = {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  lottieIcon?: string;
  children: React.ReactNode;
  className?: string;
  layout?: PrimaryButtonAuthLayout;
  soundClick?: UISoundId;
  soundHover?: UISoundId;
};

// Убираем проп size и ставим 100%, чтобы размер контролировался через CSS (.icon)
function PlayIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="#734517"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

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

export function PrimaryButtonAuth({
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  lottieIcon,
  children,
  className = '',
  layout = 'auth',
  soundClick,
  soundHover,
}: PrimaryButtonAuthProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
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
      data-layout={layout}
      className={`${styles.button} ${className}`}
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
        ) : (
          <PlayIcon />
        )}
      </span>
    </motion.button>
  );
}
