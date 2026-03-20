import { useEffect, useRef, useState } from 'react';

type GameTimerProps = {
  endsAt: string;
  onExpire?: () => void;
  isPaused?: boolean;
  /** При паузе: оставшееся время в мс из БД — таймер показывает его и не тикает */
  remainingMsWhenPaused?: number | null;
};

export function GameTimer({ endsAt, onExpire, isPaused = false, remainingMsWhenPaused = null }: GameTimerProps) {
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
  const isWarning = minutes < 3;
  const isDanger = minutes < 1;

  const backgroundColor = isPaused 
    ? '#f5f5f5' 
    : isDanger 
    ? '#ffebee' 
    : isWarning 
    ? '#fff3e0' 
    : '#e8f5e9';

  const timerColor = isPaused 
    ? 'gray' 
    : isDanger 
    ? 'red' 
    : isWarning 
    ? 'orange' 
    : 'green';

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '20px',
      border: '2px solid #333',
      marginBottom: '20px',
      background: backgroundColor
    }}>
      <h3>
        ⏱️ Время до конца игры:{isPaused ? ' ⏸️ ПАУЗА' : ''}
      </h3>
      <div style={{ 
        fontSize: '48px', 
        fontWeight: 'bold',
        color: timerColor
      }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      {isExpired && !isPaused && (
        <p style={{ color: 'red', fontSize: '20px' }}>Время вышло!</p>
      )}
    </div>
  );
}
