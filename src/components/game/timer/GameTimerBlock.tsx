'use client';

import { GameTimer } from './GameTimer';
import { LottieIcon } from '@/components/ui/LottieIcon';
import styles from './GameTimerBlock.module.css';

type GameTimerBlockProps = {
  endsAt: string;
  onExpire?: () => void;
  isPaused?: boolean;
  remainingMsWhenPaused?: number | null;
};

export function GameTimerBlock({
  endsAt,
  onExpire,
  isPaused = false,
  remainingMsWhenPaused = null,
}: GameTimerBlockProps) {
  return (
    <div className={`glass ${styles.wrap} ${isPaused ? styles.paused : ''}`}>
      <div className={styles.iconWrap}>
        <LottieIcon 
          src="/lottie/timer.json" 
          size={32} 
          loop={true} 
          /* Используем управление через playOnHover/hovered */
          playOnHover 
          hovered={!isPaused} 
        />
      </div>
      <div className={styles.timerContent}>
        <GameTimer
          endsAt={endsAt}
          onExpire={onExpire}
          isPaused={isPaused}
          remainingMsWhenPaused={remainingMsWhenPaused}
        />
      </div>
    </div>
  );
}