'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LottieIcon } from './LottieIcon';
import { playUI, type UISoundId } from '@/lib/sound';
import styles from './PrimaryButton.module.css';

const MotionLink = motion.create(Link);

type PrimaryButtonLobbyProps = {
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Навигация без legacyBehavior на Link: рендерится как motion(Link) с теми же стилями */
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  lottieIcon?: string;
  /** Без иконки — текст центрируется */
  noIcon?: boolean;
  children: React.ReactNode;
  className?: string;
  soundClick?: UISoundId;
  soundHover?: UISoundId;
  variant?: 'lobby' | 'summary';
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

export function PrimaryButtonLobby({
  onClick,
  href,
  disabled = false,
  loading = false,
  lottieIcon,
  noIcon = false,
  children,
  className = '',
  soundClick,
  soundHover,
  variant = 'lobby',
}: PrimaryButtonLobbyProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;
  const sizeClass = variant === 'summary' ? styles.buttonSummary : styles.buttonLobby;
  const mergedClass = `${styles.button} ${sizeClass} ${noIcon ? styles.buttonNoIcon : ''} ${className}`;
  const motionHover =
    isDisabled
      ? undefined
      : {
          filter: 'brightness(1.08)',
        };
  const motionTap =
    isDisabled
      ? undefined
      : {
          scale: 0.97,
          filter: 'brightness(0.93)',
        };

  const content = (
    <>
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
    </>
  );

  if (href && !isDisabled) {
    return (
      <MotionLink
        href={href}
        className={mergedClass}
        onClick={(event) => {
          if (soundClick) playUI(soundClick);
          onClick?.(event);
        }}
        onMouseEnter={() => {
          setHovered(true);
          if (soundHover) playUI(soundHover);
        }}
        onMouseLeave={() => setHovered(false)}
        whileHover={motionHover}
        whileTap={motionTap}
        transition={{ duration: 0.08 }}
      >
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        if (!isDisabled && soundClick) playUI(soundClick);
        onClick?.(event);
      }}
      disabled={isDisabled}
      onMouseEnter={() => {
        setHovered(true);
        if (!isDisabled && soundHover) playUI(soundHover);
      }}
      onMouseLeave={() => setHovered(false)}
      className={mergedClass}
      whileHover={motionHover}
      whileTap={motionTap}
      transition={{ duration: 0.08 }}
    >
      {content}
    </motion.button>
  );
}
