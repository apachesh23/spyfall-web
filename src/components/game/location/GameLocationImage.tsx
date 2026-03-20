'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import styles from './GameLocationImage.module.css';

type GameLocationImageProps = {
  imageKey?: string | null;
  /** Если true — шпион видит не реальную локацию, а заглушку spyN.webp */
  isSpy?: boolean;
};

export function GameLocationImage({ imageKey, isSpy = false }: GameLocationImageProps) {
  const [spyKey, setSpyKey] = useState<string | null>(() => {
    if (!isSpy) return null;
    const placeholders = ['spy1', 'spy2', 'spy3', 'spy4'];
    const idx = Math.floor(Math.random() * placeholders.length);
    return placeholders[idx];
  });

  useEffect(() => {
    if (!isSpy) {
      setSpyKey(null);
      return;
    }
    if (spyKey) return;
    const placeholders = ['spy1', 'spy2', 'spy3', 'spy4'];
    const idx = Math.floor(Math.random() * placeholders.length);
    setSpyKey(placeholders[idx]);
  }, [isSpy, spyKey]);

  const currentKey = isSpy ? spyKey : imageKey;
  const hasLocationImage = !!currentKey;
  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg']);

  // Блик должен быть на противоположной стороне от мышки
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['100%', '0%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['100%', '0%']);

  const glareOpacity = useTransform(
    [mouseXSpring, mouseYSpring],
    ([currX, currY]: number[]) => {
      const distance = Math.sqrt(currX * currX + currY * currY);
      return Math.min(distance * 1.5, 0.4);
    }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div
      className={styles.container}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={styles.tiltWrapper}
        style={{
          '--top': '11%',
          '--left': '4.5%',
          '--width': '91%',
          '--height': '79%',
        } as React.CSSProperties}
      >
        <motion.div
          className={styles.innerImage}
          style={{
            rotateX,
            rotateY,
            scale: 1.08,
            transformStyle: "preserve-3d",
          }}
        >
          {hasLocationImage ? (
            <img
              src={`/location/${currentKey}.webp`}
              alt="Location"
              className={styles.locationImage}
              decoding="async"
            />
          ) : (
            <div className={styles.locationSkeleton} aria-hidden />
          )}

          {/* Слой блика */}
          <motion.div
            className={styles.glareLayer}
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              opacity: glareOpacity as any,
              WebkitMaskImage: "radial-gradient(circle, black, transparent)",
              transform: "translateZ(1px)",
              left: glareX,
              top: glareY,
              x: "-50%",
              y: "-50%",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any}
          />
        </motion.div>
      </div>

      {isSpy && (
        <div className={styles.spyOverlay}>
          <div className={styles.spyOverlayInner}>
            <p className={styles.spyTitle}>ВЫ ШПИОН!</p>
            <p className={styles.spySubtitle}>
              Вычислите локацию до конца раунда или не дайте себя раскрыть.
            </p>
          </div>
        </div>
      )}

      <img
        src="/location/location_frame.webp"
        alt="Рамка"
        className={styles.frameImage}
        width={1450}
        height={927}
        decoding="async"
      />
    </div>
  );
}
