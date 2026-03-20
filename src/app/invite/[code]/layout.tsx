'use client';

import { AuthMusicMount } from '@/components/layout/AuthMusicMount';
import { VideoBackground } from '@/components/layout/VideoBackground';
import { RotatePrompt } from '@/components/layout/RotatePrompt';
import { TopBar } from '@/components/layout/TopBar';
import styles from './layout.module.css';

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VideoBackground>
      <AuthMusicMount />
      <RotatePrompt />
      <div className={styles.screenRoot}>
        <div className={styles.screenGrid}>
          <header className={styles.header}>
            <TopBar />
          </header>
          <main className={styles.main}>
            <div className={styles.formContainer}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </VideoBackground>
  );
}
