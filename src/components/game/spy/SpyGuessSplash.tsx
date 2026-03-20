'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playVFX } from '@/lib/sound';
import { LottieIcon } from '@/components/ui/LottieIcon';
import styles from './SpyGuessSplash.module.css';

const SPY_GUESS_LOTTIE = '/lottie/splash/spyguess.json';
const LAST_SECONDS_ANIMATED = 10;
const FRONT_ANGLE = -3;
const easeSmooth = [0.22, 1, 0.36, 1] as const;
const DARK_FRONT = '#262523';
const DARK_BACK = '#1c1b1a';

const topFrontVariants = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: { clipPath: 'inset(0 0 0 0)', transition: { duration: 0.6, ease: easeSmooth } },
  exit: { clipPath: 'inset(0 100% 0 0)', transition: { duration: 0.4, ease: easeSmooth } },
};
const bottomBackVariants = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.65, delay: 0.05, ease: easeSmooth } },
  exit: { clipPath: 'inset(0 100% 0 0)', transition: { duration: 0.4, ease: easeSmooth } },
};
const bottomFrontVariants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.6, ease: easeSmooth } },
  exit: { clipPath: 'inset(0 0 0 100%)', transition: { duration: 0.4, ease: easeSmooth } },
};

export type SpyGuessSplashProps = {
  title?: string;
  countdownLabel?: string;
  endsAt?: string;
  onClose?: () => void;
  resultCountdown?: number | null;
  resultCountdownLabel?: string;
  children?: React.ReactNode;
};

export function SpyGuessSplash({
  title = 'ШПИОН УГАДАЛ ?',
  countdownLabel = 'ВЫБЕРИТЕ ОТВЕТ...',
  endsAt: endsAtProp,
  onClose,
  resultCountdown = null,
  resultCountdownLabel,
  children,
}: SpyGuessSplashProps) {
  const showResultCountdown = resultCountdown !== undefined && resultCountdown !== null;
  const wasShowingResultRef = useRef(false);
  const exitingFromResultRef = useRef(false);
  const lastResultLabelRef = useRef(resultCountdownLabel ?? '');
  if (showResultCountdown) {
    wasShowingResultRef.current = true;
    lastResultLabelRef.current = resultCountdownLabel ?? '';
  } else if (wasShowingResultRef.current) {
    wasShowingResultRef.current = false;
    exitingFromResultRef.current = true;
  }
  const exitingFromResult = exitingFromResultRef.current;

  const initialCount = (() => {
    if (showResultCountdown) return 0;
    if (endsAtProp) {
      const remaining = Math.floor((new Date(endsAtProp).getTime() - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return 0;
  })();

  const [count, setCount] = useState(initialCount);
  const [showNumber, setShowNumber] = useState(false);
  const prevCountRef = useRef(initialCount);
  const closedRef = useRef(false);

  const hasCountdown = showResultCountdown || exitingFromResult || !!endsAtProp;

  useEffect(() => {
    playVFX('woosh_in');
  }, []);

  useEffect(() => {
    if (!hasCountdown) return;
    const t = setTimeout(() => setShowNumber(true), 600);
    return () => clearTimeout(t);
  }, [hasCountdown]);

  useEffect(() => {
    if (showResultCountdown) return;
    if (!hasCountdown || !showNumber || count > LAST_SECONDS_ANIMATED) return;
    if (count < prevCountRef.current) {
      if (count === 0) playVFX('countdown_last');
      else playVFX('countdown_sec');
    }
    prevCountRef.current = count;
  }, [showResultCountdown, hasCountdown, showNumber, count]);

  useEffect(() => {
    if (showResultCountdown) return;
    if (!hasCountdown) return;
    if (count <= 0) {
      if (!closedRef.current) {
        closedRef.current = true;
        const t = setTimeout(() => {
          playVFX('woosh_out');
          onClose?.();
        }, 800);
        return () => clearTimeout(t);
      }
      return undefined;
    }
    if (!showNumber) return;
    const t = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [showResultCountdown, hasCountdown, showNumber, count, onClose]);

  const displayLabel = exitingFromResult ? lastResultLabelRef.current : showResultCountdown ? (resultCountdownLabel ?? '') : countdownLabel;
  const displayNumber = exitingFromResult ? 0 : showResultCountdown ? resultCountdown! : count;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={styles.overlay}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      style={
        {
          '--voting-front': DARK_FRONT,
          '--voting-back': DARK_BACK,
          '--top-strip-text-rotate': '0deg',
          '--bottom-strip-text-rotate': '0deg',
        } as React.CSSProperties
      }
    >
      <div className={styles.inner}>
        <div className={styles.topStrip}>
          <motion.div
            className={styles.topStripFront}
            style={{ transform: `rotate(${FRONT_ANGLE}deg)` }}
            variants={topFrontVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className={styles.topStripContent}>
              <LottieIcon src={SPY_GUESS_LOTTIE} loop size={60} />
              <span className={styles.topStripText}>{title}</span>
            </div>
          </motion.div>
        </div>

        <div className={styles.center}>{children}</div>

        <div className={styles.bottomStrip}>
          <motion.div
            className={styles.bottomBack}
            style={{ transform: `rotate(${FRONT_ANGLE}deg) translateY(50px)` }}
            variants={bottomBackVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.div
            className={styles.bottomFront}
            style={{ transform: `rotate(${FRONT_ANGLE}deg)` }}
            variants={bottomFrontVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {hasCountdown && (
              <span className={`${styles.bottomStripText} ${styles.countdownRow}`}>
                <span className={styles.bottomStripLabel}>{displayLabel}</span>
                <motion.span
                  className={styles.countdownNumberWrap}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: showResultCountdown ? 0 : 0.6, duration: 0.25 } }}
                  exit={{ opacity: 0 }}
                >
                  {showNumber || showResultCountdown ? (
                    displayNumber > LAST_SECONDS_ANIMATED ? (
                      <span className={styles.countdownNumber}>{displayNumber}</span>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={displayNumber}
                          className={styles.countdownNumber}
                          initial={{ scale: 0.35, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 22 } }}
                          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                        >
                          {displayNumber}
                        </motion.span>
                      </AnimatePresence>
                    )
                  ) : (
                    <span className={styles.countdownNumber}>—</span>
                  )}
                </motion.span>
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
