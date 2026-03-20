'use client';

import { use } from 'react';
import { AuthMusicMount } from '@/components/layout/AuthMusicMount';
import { LobbyMusicMount } from '@/components/layout/LobbyMusicMount';
import { VideoBackground } from '@/components/layout/VideoBackground';
import { RotatePrompt } from '@/components/layout/RotatePrompt';
import { TopBar } from '@/components/layout/TopBar';
import { ReactionsBar } from '@/components/layout/ReactionsBar';
import { ReactionsProvider } from '@/contexts/ReactionsContext';
import styles from './layout.module.css';

export default function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  use(params);

  return (
    <ReactionsProvider>
      <VideoBackground contentClassName="videoContentLobbyMobile" >
        <AuthMusicMount />
        <LobbyMusicMount />
        <RotatePrompt />
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
