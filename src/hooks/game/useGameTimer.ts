import { useState, useEffect } from 'react';

export function useGameTimer(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    console.log('⏰ Timer initialized');
    console.log('Ends at string:', endsAt);
    
    // Убираем лишнюю обработку - Date умеет парсить ISO8601 с timezone
    const endTime = new Date(endsAt).getTime();
    
    console.log('End time timestamp:', endTime);
    console.log('End time date:', new Date(endTime));
    console.log('Current time:', new Date());
    
    if (isNaN(endTime)) {
      console.error('❌ Invalid date format:', endsAt);
      return;
    }
    
    function updateTimer() {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
      } else {
        setTimeLeft(remaining);
        setIsExpired(false);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return {
    minutes,
    seconds,
    isExpired,
    totalSeconds: Math.floor(timeLeft / 1000),
  };
}