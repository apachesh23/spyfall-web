'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';
import styles from './layout.module.css';

type LogoProps = {
  className?: string;
  /** Если не задано — используется адаптивный размер из layout.module.css (на мобиле меньше) */
  height?: number;
};

const LETTERS = ['S', 'P', 'Y', 'F', 'A', 'L', 'L'] as const;

export function Logo({ className = '', height }: LogoProps) {
  const [duckData, setDuckData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/lottie/duck.json')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDuckData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const useResponsive = height == null;
  const h = height ?? 46;
  const fontSize = Math.round(h * 0.85);
  const duckSize = Math.round(h * 1.1);

  return (
    <div
      className={[styles.logo, className].filter(Boolean).join(' ')}
      style={useResponsive ? undefined : { fontSize, height: h }}
      aria-label="Spyfall"
    >
      {LETTERS.map((letter, i) =>
        letter === 'A' ? (
          <span
            key="duck"
            className={styles.logoDuck}
            style={useResponsive ? undefined : { width: duckSize, height: duckSize }}
          >
            {duckData ? (
              <Lottie
                animationData={duckData}
                loop
                autoplay
                style={useResponsive ? { width: '100%', height: '100%' } : { width: duckSize, height: duckSize }}
              />
            ) : (
              <span style={useResponsive ? undefined : { fontSize }}>A</span>
            )}
          </span>
        ) : (
          <span key={i}>{letter}</span>
        )
      )}
    </div>
  );
}
