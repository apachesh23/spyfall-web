'use client';

import { use } from 'react';
import { VideoBackground } from '@/components/layout/VideoBackground';
import { TopBar } from '@/components/layout/TopBar';
import { ReactionsBar } from '@/components/layout/ReactionsBar';
import { ReactionsProvider } from '@/contexts/ReactionsContext';
import styles from './layout.module.css';

export default function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  use(params);

  return (
    <ReactionsProvider>
    <VideoBackground contentClassName="videoContentLobbyMobile" backgroundType="tile">
      <div className={styles.screenRoot}>
        <div className={styles.screenGrid}>
          <header className={styles.header}>
            <TopBar />
          </header>
          <main className={styles.main}>
            <div className={styles.mainContent}>
              <div className={styles.container}>
                {children}
              </div>
            </div>
            <ReactionsBar />
          </main>
        </div>
      </div>
    </VideoBackground>
    </ReactionsProvider>
  );
}
