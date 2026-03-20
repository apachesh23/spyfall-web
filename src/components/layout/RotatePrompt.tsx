'use client';

import { useState, useEffect } from 'react';
import { LottieIcon } from '@/components/ui/LottieIcon';
import styles from './layout.module.css';

/**
 * На мобиле в portrait показывает overlay «Поверните устройство».
 * Иконка mobile.json выше текста; позже можно анимировать поворот через Framer Motion.
 */
export function RotatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!show) return null;

  return (
    <div className={styles.rotateOverlay} aria-hidden>
      <div className={styles.rotateContent}>
        <LottieIcon src="/lottie/mobile.json" loop size={80} className={styles.rotateIcon} />
        <p className={styles.rotateText}>Поверните устройство для продолжения</p>
      </div>
    </div>
  );
}
