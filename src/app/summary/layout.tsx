'use client';

import { useEffect } from 'react';
import { VideoBackground } from '@/components/layout/VideoBackground';
import { TopBar } from '@/components/layout/TopBar';
import { useRouteLoaderStore } from '@/store/route-loader-store';
import styles from './layout.module.css';

export default function SummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stopGlobalLoader = useRouteLoaderStore((s) => s.stop);

  useEffect(() => {
    // При заходе на Summary всегда гасим глобальный лоадер,
    // который стартует перед редиректом из игровой комнаты.
    stopGlobalLoader();
  }, [stopGlobalLoader]);

  return (
    <VideoBackground contentClassName="videoContentLobbyMobile" backgroundType="tile">
      <div className={styles.screenRoot}>
        <div className={styles.screenGrid}>
          <header className={styles.header}>
            <TopBar />
          </header>
          <main className={styles.main}>
            <div className={styles.container}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </VideoBackground>
  );
}
