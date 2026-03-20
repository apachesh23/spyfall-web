'use client';

import { useEffect, useRef } from 'react';
import { startLobbyMusic, stopLobbyMusic } from '@/lib/sound';

/**
 * Монтируется в layout лобби/комнаты. Музыка не стартует сразу из-за политики
 * автоплея — запускаем по первой интеракции пользователя (клик/тап/клавиша),
 * а при размонтировании экрана лобби — останавливаем.
 */
export function LobbyMusicMount() {
  const authorized = useRef(false);
  const playing = useRef(false);

  useEffect(() => {
    const onUserInteraction = () => {
      if (!authorized.current) {
        authorized.current = true;
      }
      if (document.visibilityState !== 'visible') return;
      if (!playing.current) {
        startLobbyMusic();
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
          stopLobbyMusic();
          playing.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopLobbyMusic();
      playing.current = false;
      document.removeEventListener('click', onUserInteraction);
      document.removeEventListener('touchend', onUserInteraction);
      document.removeEventListener('keydown', onUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}

