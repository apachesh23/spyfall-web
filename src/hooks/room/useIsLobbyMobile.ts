'use client';

import { useState, useEffect } from 'react';

const LOBBY_MOBILE_BREAKPOINT = '(max-width: 1024px)';

export function useIsLobbyMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LOBBY_MOBILE_BREAKPOINT);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
