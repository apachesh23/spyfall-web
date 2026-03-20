'use client';

import { useEffect, useRef } from 'react';
import { startAuthMusic, stopAuthMusic } from '@/lib/sound';

/**
 * Монтируется в layout экранов Create/Invite. Музыка не стартует сразу из-за политики
 * автовоспроизведения браузеров — запуск по первому клику/тапу/нажатию клавиши.
 */
export function AuthMusicMount() {
  const authorized = useRef(false);
  const playing = useRef(false);

  useEffect(() => {
    const onUserInteraction = () => {
      if (!authorized.current) {
        authorized.current = true;
      }
      if (document.visibilityState !== 'visible') return;
      if (!playing.current) {
        startAuthMusic();
        playing.current = true;
      }
    };

    document.addEventListener('click', onUserInteraction, { passive: true });
    document.addEventListener('touchend', onUserInteraction, { passive: true });
    document.addEventListener('keydown', onUserInteraction, { passive: true });

    const handleVisibility = () => {
      if (!authorized.current) return;
      if (document.visibilityState === 'hidden') {
        if (playing.current) {
          stopAuthMusic();
          playing.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopAuthMusic();
      playing.current = false;
      document.removeEventListener('click', onUserInteraction);
      document.removeEventListener('touchend', onUserInteraction);
      document.removeEventListener('keydown', onUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}
