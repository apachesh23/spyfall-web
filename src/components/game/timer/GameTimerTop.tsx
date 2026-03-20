import { useEffect, useRef, useState } from 'react';
import { LottieIcon } from '@/components/ui/LottieIcon';
import styles from './GameTimerTop.module.css';

type GameTimerTopProps = {
  endsAt: string;
  onExpire?: () => void;
  isPaused?: boolean;
  remainingMsWhenPaused?: number | null;
  /** Вариант размещения таймера: поверх картинки (overlay) или встроенный в layout (inline). */
  variant?: 'overlay' | 'inline';
};

export function GameTimerTop({
  endsAt,
  onExpire,
  isPaused = false,
  remainingMsWhenPaused = null,
  variant = 'overlay',
}: GameTimerTopProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const expiredCalled = useRef(false);

  useEffect(() => {
    if (isPaused && remainingMsWhenPaused != null) {
      setTimeLeft(remainingMsWhenPaused);
      return;
    }

    const endTime = new Date(endsAt).getTime();

    function updateTimer() {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsExpired(true);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt, isPaused, remainingMsWhenPaused]);

  useEffect(() => {
    if (isExpired && onExpire && !expiredCalled.current) {
      expiredCalled.current = true;
      onExpire();
    }
  }, [isExpired, onExpire]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const isWarning = minutes < 3 && !isPaused;
  const isDanger = minutes < 1 && !isPaused;

  const toneClass = isPaused
    ? styles.paused
    : isDanger
    ? styles.danger
    : isWarning
    ? styles.warn
    : styles.ok;

  const rootClass =
    variant === 'inline' ? `${styles.rootInline} ${toneClass}` : `${styles.root} ${toneClass}`;

  const iconSize = variant === 'inline' ? 32 : 44;

  return (
    <div className={rootClass}>
      <div className={styles.icon}>
        <LottieIcon
          src="/lottie/timer.json"
          size={iconSize}
          loop
          playOnHover
          hovered={!isPaused}
        />
      </div>
      <div className={styles.time}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
}

