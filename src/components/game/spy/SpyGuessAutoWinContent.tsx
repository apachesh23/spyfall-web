'use client';

import styles from './SpyGuessSplash.module.css';

type SpyGuessAutoWinContentProps = {
  guessText: string;
};

export function SpyGuessAutoWinContent({ guessText }: SpyGuessAutoWinContentProps) {
  return (
    <div className={styles.centerWrap}>
      <p className={styles.subtitle}>Шпион предположил что это локация</p>
      <div className={`glass ${styles.guessBlock}`}>{guessText}</div>
      <p className={styles.autoWinLabel}>Засчитано автоматически</p>
    </div>
  );
}
