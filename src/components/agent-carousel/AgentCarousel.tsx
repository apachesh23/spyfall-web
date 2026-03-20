'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { AVATAR_LIST, type AvatarId, getAvatar } from '@/lib/avatars';
import { AgentAvatar } from './AgentAvatar';
import { AgentDescription } from './AgentDescription';
import { playUI } from '@/lib/sound';
import styles from './Agent.module.css';

type AgentCarouselProps = {
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
};

const RADIUS = 570;
const DOT_SIZE = 200;
const COUNT = 16;
const STAGE_WIDTH = 600;
const STAGE_HEIGHT = RADIUS + DOT_SIZE / 2;
const ARC_VISIBLE_HEIGHT = 240;

const SWIPE_THRESHOLD_PX = 40;
const MAX_BLUR_PX = 6;

export function AgentCarousel({ selectedId, onSelect }: AgentCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [carouselScale, setCarouselScale] = useState(1);
  
  // -- Refs для свайпа --
  const touchStartX = useRef(0);
  const lastTouchTime = useRef(0);
  const swipeHandledRef = useRef(false);
  
  // -- Refs для логики блюра и инерции --
  const lastStepTime = useRef(0);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const momentumTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // -- Motion Values --
  const blurAmount = useMotionValue(0);
  const smoothBlur = useSpring(blurAmount, { stiffness: 400, damping: 30 });
  const blurStyle = useTransform(smoothBlur, (v) => `${v}px`);

  const index = selectedId - 1;
  const indexRef = useRef(index);
  indexRef.current = index;

  // -- Адаптив --
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      setCarouselScale(Math.min(1, el.clientWidth / STAGE_WIDTH));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [isShuffling, setIsShuffling] = useState(false);
  const [randomRollDuration, setRandomRollDuration] = useState(0);

  // -- ЦЕНТРАЛИЗОВАННЫЙ ШАГ И УПРАВЛЕНИЕ БЛЮРОМ --
  const handleStep = useCallback((newIndex: number, forceBlur = false) => {
    const now = Date.now();
    const timeDiff = now - lastStepTime.current;
    
    // Логика авто-блюра:
    if (forceBlur || timeDiff < 120) {
      blurAmount.set(MAX_BLUR_PX);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        blurAmount.set(0);
      }, 150);
    } else {
      blurAmount.set(0);
    }

    lastStepTime.current = now;
    
    const wrapped = (newIndex % COUNT + COUNT) % COUNT;
    onSelect((wrapped + 1) as AvatarId);
  }, [onSelect, blurAmount]);

  // -- Helpers --
  const wrap = (i: number) => ((i % COUNT) + COUNT) % COUNT;

  const next = useCallback(() => {
    playUI('tick');
    handleStep(indexRef.current + 1);
  }, [handleStep]);

  const prev = useCallback(() => {
    playUI('tick');
    handleStep(indexRef.current - 1);
  }, [handleStep]);

  // -- ЛОГИКА ИНЕРЦИИ (MOMENTUM) ДЛЯ СВАЙПА --
  const runMomentum = useCallback((direction: number, steps: number) => {
    if (steps <= 0) return;
    
    let currentStep = 0;
    const interval = Math.max(40, 80 - steps * 5); 

    const tick = () => {
      playUI('tick');
      handleStep(indexRef.current + direction, true);
      
      currentStep++;
      if (currentStep < steps) {
        momentumTimeoutRef.current = setTimeout(tick, interval);
      }
    };
    tick();
  }, [handleStep]);

  // Очистка таймеров
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (momentumTimeoutRef.current) clearTimeout(momentumTimeoutRef.current);
    };
  }, []);

  // -- Обработка Колеса Мыши --
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isShuffling) return;
    
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 2) return;
      (delta > 0 ? next : prev)();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [next, prev, isShuffling]);

  // -- Touch Events --
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (momentumTimeoutRef.current) {
      clearTimeout(momentumTimeoutRef.current);
      momentumTimeoutRef.current = null;
    }
    touchStartX.current = e.touches[0].clientX;
    lastTouchTime.current = Date.now();
    swipeHandledRef.current = false;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isShuffling) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaTime = Date.now() - lastTouchTime.current;
      
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

      const velocity = Math.abs(deltaX / deltaTime); 
      const direction = deltaX > 0 ? -1 : 1;
      
      const baseSteps = Math.floor(Math.abs(deltaX) / 50);
      const velocityBonus = velocity > 0.5 ? Math.floor(velocity * 5) : 0;
      const totalSteps = Math.max(1, baseSteps + velocityBonus);

      swipeHandledRef.current = true;
      runMomentum(direction, totalSteps);
    },
    [isShuffling, runMomentum]
  );

  // -- Кнопка RANDOM --
  const handleRandomShuffle = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    indexRef.current = index;
    const shuffleSpeed = 50;
    const minDuration = 400;
    const maxDuration = 1000;
    const shuffleDuration = minDuration + Math.random() * (maxDuration - minDuration);
    setRandomRollDuration(shuffleDuration);
    const endSpeed = shuffleSpeed * 2;
    const acceleration = Math.pow(endSpeed / shuffleSpeed, 1 / (shuffleDuration / shuffleSpeed));
    let currentSpeed = shuffleSpeed;
    let elapsedTime = 0;

    const spin = () => {
      // --- ВОТ ЗДЕСЬ ИСПРАВЛЕНИЕ: ДОБАВИЛИ ЗВУК ---
      playUI('tick'); 
      handleStep(indexRef.current + 1, true); 
      
      elapsedTime += currentSpeed;
      if (elapsedTime < shuffleDuration) {
        currentSpeed *= acceleration;
        setTimeout(spin, currentSpeed);
      } else {
        setIsShuffling(false);
        setRandomRollDuration(0);
        blurAmount.set(0);
      }
    };
    spin();
  }, [isShuffling, index, handleStep, blurAmount]);

  // -- Рендер --
  const positioned = useMemo(() => {
    const centerY = RADIUS;
    const stepRad = (Math.PI * 2) / COUNT;
    const offset = -index * stepRad;
    
    return AVATAR_LIST.map((avatar, i) => {
      const a = i * stepRad + offset;
      const rawX = RADIUS * Math.sin(a);
      const rawY = centerY - RADIUS * Math.cos(a);

      const relativeIndex = (i - index + COUNT) % COUNT;
      const isCenter = relativeIndex === 0;
      const isLeft = relativeIndex === COUNT - 1;
      const isRight = relativeIndex === 1;
      const isFarLeft = relativeIndex === COUNT - 2; 
      const isFarRight = relativeIndex === 2;

      const isVisible = isCenter || isLeft || isRight || isFarLeft || isFarRight;
      
      const top = Math.max(0, Math.cos(a));
      const scale = isCenter ? 1 : 0.8;
      const opacity = (isFarLeft || isFarRight) ? 0 : (isCenter ? 1 : 0.3);
      const z = 10 + Math.round(100 * top);

      return { 
        avatar, i, rawX, rawY, scale, opacity, z, 
        isInDOM: isVisible, isCenter, isLeft, isRight 
      };
    });
  }, [index]);

  const leftIdx = wrap(index - 1);
  const rightIdx = wrap(index + 1);
  const currentAgent = getAvatar(selectedId);

  return (
    <div className={styles.agentCarouselRoot}>
      <div
        ref={containerRef}
        className={styles.agentCarouselArcContainer}
        style={{ height: ARC_VISIBLE_HEIGHT * carouselScale }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={styles.agentCarouselArcStage}
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `translateX(-50%) translateY(${90 * carouselScale}px) scale(${carouselScale})`,
          }}
        >
          <div className={styles.agentCarouselArcInner}>
            {positioned
              .filter((item) => item.isInDOM)
              .map(({ avatar, i, rawX, rawY, scale, opacity, z, isCenter }) => {
                const isNeighbor = i === leftIdx || i === rightIdx;
                
                const handleClick = () => {
                  if (swipeHandledRef.current) {
                    swipeHandledRef.current = false;
                    return;
                  }
                  if (isShuffling) return;
                  if (i === leftIdx) prev();
                  if (i === rightIdx) next();
                };

                return (
                  <motion.div
                    key={avatar.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                      }
                    }}
                    className={styles.agentCarouselItem}
                    
                    animate={{
                      x: rawX - DOT_SIZE / 2, 
                      y: rawY - DOT_SIZE / 2,
                      scale: scale,
                      opacity: opacity,
                      zIndex: z,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 1
                    }}
                    initial={false}
                    style={{
                      '--motion-blur': blurStyle,
                      cursor: isShuffling ? 'var(--cursor-spy)' : isNeighbor ? 'var(--cursor-spy-pointer)' : 'var(--cursor-spy)',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any}
                  >
                    <AgentAvatar
                      avatar={avatar}
                      size={DOT_SIZE}
                      showMask
                      borderRadius={60}
                      borderColor={isCenter ? 'rgba(247, 196, 49, 1)' : 'rgba(102, 102, 102, 1)'}
                      borderWidth={isCenter ? 3 : 2}
                      glowEffect={isCenter}
                    />
                  </motion.div>
                );
              })}
          </div>
        </div>
      </div>

      <AgentDescription
        agent={currentAgent ?? null}
        onRandomClick={handleRandomShuffle}
        randomDisabled={isShuffling}
        randomRollDuration={randomRollDuration}
      />
    </div>
  );
}