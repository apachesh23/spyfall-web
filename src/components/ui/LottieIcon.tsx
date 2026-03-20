'use client';

import { useRef, useEffect, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

type LottieIconProps = {
  /** Путь к JSON в public, например /lottie/gamepad.json */
  src: string;
  /** Воспроизводить при наведении (передаётся с кнопки: true = hover) */
  playOnHover?: boolean;
  /** Родитель наведён — запустить анимацию с начала */
  hovered?: boolean;
  /** Зациклить анимацию (для логотипа) */
  loop?: boolean;
  /** Один раз проиграть с начала при монтировании (для реакций на аватарках) */
  autoplayOnce?: boolean;
  /** Проиграть один раз с начала; по окончании вызывается onComplete */
  playOnce?: boolean;
  /** При playOnce — проиграть только кадры [start, end]; по окончании сегмента вызывается onComplete */
  playSegment?: [number, number];
  /** Зацикленно проигрывать только кадры [start, end] (idle-анимация) */
  loopSegment?: [number, number];
  /** Вызывается по окончании анимации (при playOnce или pingPong) */
  onComplete?: () => void;
  /** Играть анимацию туда‑сюда: вперёд, потом назад, снова вперёд (для фоновых эффектов) */
  pingPong?: boolean;
  className?: string;
  size?: number;
};

export function LottieIcon({
  src,
  playOnHover = false,
  hovered = false,
  loop = false,
  autoplayOnce = false,
  playOnce = false,
  playSegment,
  loopSegment,
  onComplete,
  pingPong = false,
  className = '',
  size,
}: LottieIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const pingDirectionRef = useRef<1 | -1>(1);
  const playOnceStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!playOnHover || !lottieRef.current) return;
    if (hovered) {
      lottieRef.current.goToAndPlay(0, true);
    } else {
      lottieRef.current.goToAndStop(0, true);
    }
  }, [playOnHover, hovered]);

  useEffect(() => {
    if (!autoplayOnce || pingPong || playOnce || !lottieRef.current || !animationData) return;
    lottieRef.current.goToAndPlay(0, true);
  }, [autoplayOnce, pingPong, playOnce, animationData]);

  // Сброс флага, когда playOnce выключили (чтобы при следующем закрытии анимация снова запустилась)
  useEffect(() => {
    if (!playOnce) playOnceStartedRef.current = false;
  }, [playOnce]);

  useEffect(() => {
    if (!playOnce || !lottieRef.current || !animationData || playOnceStartedRef.current) return;
    playOnceStartedRef.current = true;
    const inst = lottieRef.current as unknown as { playSegments?: (segments: number[], forceFlag: boolean) => void } | null;
    if (playSegment && inst?.playSegments) {
      inst.playSegments([playSegment[0], playSegment[1]], true);
    } else {
      lottieRef.current.goToAndPlay(0, true);
    }
  }, [playOnce, playSegment, animationData]);

  // Зацикленный сегмент кадров (idle)
  useEffect(() => {
    if (!loopSegment || !lottieRef.current || !animationData) return;
    const inst = lottieRef.current as unknown as { playSegments?: (segments: number[], forceFlag: boolean) => void } | null;
    inst?.playSegments?.([loopSegment[0], loopSegment[1]], true);
  }, [loopSegment, animationData]);

  // Ping-pong: вперёд → назад → вперёд...
  useEffect(() => {
    if (!pingPong || !lottieRef.current || !animationData) return;

    const inst = lottieRef.current;
    // стартуем вперёд
    inst?.setDirection?.(1);
    inst?.goToAndPlay?.(0, true);
  }, [pingPong, animationData]);

  const sizeStyle = size != null ? { width: size, height: size } : undefined;

  if (!animationData) return <span className={className} style={sizeStyle} aria-hidden />;

  return (
    <span className={className} style={sizeStyle} aria-hidden>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={pingPong ? false : !loopSegment && loop && !playOnce}
        autoplay={pingPong ? false : !loopSegment && (loop || autoplayOnce) && !playOnce}
        onComplete={
          pingPong
            ? () => {
                const inst = lottieRef.current;
                if (!inst) return;
                const nextDir = pingDirectionRef.current === 1 ? -1 : 1;
                pingDirectionRef.current = nextDir;
                inst.setDirection?.(nextDir);
                inst.goToAndPlay?.(0, true);
              }
            : playOnce
              ? () => {
                  onComplete?.();
                }
              : loopSegment
                ? () => {
                    const inst = lottieRef.current as unknown as { playSegments?: (segments: number[], forceFlag: boolean) => void } | null;
                    inst?.playSegments?.([loopSegment[0], loopSegment[1]], true);
                  }
                : undefined
        }
        style={sizeStyle}
      />
    </span>
  );
}
