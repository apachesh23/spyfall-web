'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playVFX } from '@/lib/sound';
import { LottieIcon } from '@/components/ui/LottieIcon';
import styles from './VotingSplash.module.css';

const VOTING_LOTTIE = '/lottie/splash/voting.json';
const LAST_SECONDS_ANIMATED = 10;

const FRONT_ANGLE = -3;

const easeSmooth = [0.22, 1, 0.36, 1] as const;

const topFrontVariants = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: {
    clipPath: 'inset(0 0 0 0)',
    transition: { duration: 0.6, ease: easeSmooth },
  },
  exit: {
    clipPath: 'inset(0 100% 0 0)',
    transition: { duration: 0.4, ease: easeSmooth },
  },
};

const bottomBackVariants = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.65, delay: 0.05, ease: easeSmooth },
  },
  exit: {
    clipPath: 'inset(0 100% 0 0)',
    transition: { duration: 0.4, ease: easeSmooth },
  },
};

const bottomFrontVariants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.6, ease: easeSmooth },
  },
  exit: {
    clipPath: 'inset(0 0 0 100%)',
    transition: { duration: 0.4, ease: easeSmooth },
  },
};

export type VotingSplashProps = {
  title?: string;
  /** Небольшой badge рядом с заголовком (например «РАУНД 2») */
  titleBadge?: string;
  countdownLabel?: string;
  countdownSeconds?: number;
  eventAt?: string;
  endsAt?: string;
  onClose?: () => void;
  /** Режим «результат»: внизу показываем label + число (5→0), таймер «Осталось» не тикает и не вызывает onClose. */
  resultCountdown?: number | null;
  resultCountdownLabel?: string;
  colors?: { front: string; back: string };
  children?: React.ReactNode;
};

const DEFAULT_COLORS = { front: '#F3A221', back: '#B77918' };
const DEFAULT_COUNTDOWN = 60;
const DEFAULT_COUNTDOWN_LABEL = 'ОСТАЛОСЬ...';
const CLOCK_SKEW_GRACE_SEC = 60;

export function VotingSplash({
  title = 'ГОЛОСОВАНИЕ',
  titleBadge,
  countdownLabel = DEFAULT_COUNTDOWN_LABEL,
  countdownSeconds: countdownSecondsProp,
  eventAt: eventAtProp,
  endsAt: endsAtProp,
  onClose,
  resultCountdown = null,
  resultCountdownLabel,
  colors = DEFAULT_COLORS,
  children,
}: VotingSplashProps) {
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

  const countdownSeconds = Math.max(
    0,
    countdownSecondsProp ?? DEFAULT_COUNTDOWN
  );

  const initialCount = (() => {
    if (showResultCountdown) return 0;
    if (endsAtProp) {
      const remaining = Math.floor(
        (new Date(endsAtProp).getTime() - Date.now()) / 1000
      );
      return Math.max(0, remaining);
    }
    if (countdownSeconds <= 0 || !eventAtProp) return countdownSeconds;
    let elapsed = Math.floor(
      (Date.now() - new Date(eventAtProp).getTime()) / 1000
    );
    if (elapsed < 0) elapsed = 0;
    if (elapsed < CLOCK_SKEW_GRACE_SEC) elapsed = 0;
    const remaining = countdownSeconds - elapsed;
    if (remaining <= 0) return 0;
    return remaining;
  })();

  const [count, setCount] = useState(initialCount);
  const [showNumber, setShowNumber] = useState(false);
  const prevCountRef = useRef(initialCount);
  const closedRef = useRef(false);

  const hasCountdown = showResultCountdown || exitingFromResult || (!!endsAtProp && !exitingFromResult) || (countdownSeconds > 0 && !exitingFromResult);

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
          '--voting-front': colors.front,
          '--voting-back': colors.back,
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
              <LottieIcon src={VOTING_LOTTIE} loop size={60} />
              <span className={styles.topStripText}>{title}</span>
              {titleBadge && (
                <span className={styles.titleBadge} aria-hidden>{titleBadge}</span>
              )}
            </div>
          </motion.div>
        </div>

        <div className={styles.center}>{children}</div>

        <div className={styles.bottomStrip}>
          <motion.div
            className={styles.bottomBack}
            style={{
              transform: `rotate(${FRONT_ANGLE}deg) translateY(50px)`,
            }}
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
                  animate={{
                    opacity: 1,
                    transition: { delay: showResultCountdown ? 0 : 0.6, duration: 0.25 },
                  }}
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
                          animate={{
                            scale: 1,
                            opacity: 1,
                            transition: {
                              type: 'spring',
                              stiffness: 380,
                              damping: 22,
                            },
                          }}
                          exit={{
                            scale: 0.5,
                            opacity: 0,
                            transition: { duration: 0.2 },
                          }}
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

/** Стили контента голосования (votingCenter, votingList, votingActions, skipBtn, voteBtn, votingDone) для использования в children. */
export { styles as votingSplashStyles };
