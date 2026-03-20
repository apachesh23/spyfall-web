'use client';

import styles from './layout.module.css';

type VideoBackgroundProps = {
  children: React.ReactNode;
  contentClassName?: string;
  /** 'video' — ролик (лобби и т.д.), 'tile' — тайловая текстура (игровая страница) */
  backgroundType?: 'video' | 'tile';
};

export function VideoBackground({ children, contentClassName = '', backgroundType = 'video' }: VideoBackgroundProps) {
  return (
    <div className={styles.videoRoot}>
      <div className={`${styles.videoLayer} video-bg-layer`}>
        {backgroundType === 'tile' ? (
          <>
            <div className={styles.tileLayer} aria-hidden />
            <div className={styles.tileDarkOverlay} aria-hidden />
          </>
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={styles.videoEl}
            aria-hidden
            poster="/videos/background-poster.webp"
            disablePictureInPicture
          >
            <source src="/videos/background.webm" type="video/webm" />
          </video>
        )}

        <div className={styles.videoOverlay} aria-hidden />

        <div className={`${styles.videoLayer} vignette-overlay`} aria-hidden />
      </div>

      <div className={`${styles.videoContent} ${contentClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}
