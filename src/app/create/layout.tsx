'use client';

import { AuthMusicMount } from '@/components/layout/AuthMusicMount';
import { VideoBackground } from '@/components/layout/VideoBackground';
import { TopBar } from '@/components/layout/TopBar';
import styles from './layout.module.css';

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VideoBackground>
      <AuthMusicMount />
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
