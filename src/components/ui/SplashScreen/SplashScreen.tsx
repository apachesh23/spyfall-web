'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPLASH_CONFIG } from './types';
import {
  SPLASH_CONTENT,
  DEATH_LOTTIES,
  VICTORY_LOTTIE_TOP,
  VICTORY_LOTTIE_BOTTOM,
  VICTORY_LOTTIE_CONFETTI,
  BLOOD_LOTTIE,
} from './contentConfig';
import { PrimaryButtonLobby } from '@/components/ui/PrimaryButtonLobby';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import { playVFX } from '@/lib/sound';
import type { SplashScreenProps, SplashType } from './types';

import styles from './SplashScreen.module.css';

const VICTORY_TYPES: SplashType[] = ['game_over_spy_win', 'game_over_spy_win_voting', 'game_over_civilians_win'];
const PROFILE_TYPES: SplashType[] = ['game_over_spy_win', 'game_over_spy_win_voting', 'game_over_civilians_win', 'voting_kicked_civilian', 'spy_kill'];

/** Временно: случайный выбор «шпиона» из активных игроков. Позже заменить на данные из БД. */
function pickRandomSpy<T extends { id: string }>(players: T[]): T | null {
  if (!players?.length) return null;
  return players[Math.floor(Math.random() * players.length)] ?? null;
}

const FRONT_ANGLE = -3;
const BACK_ANGLE_OFFSET = 3;
const OFFSET_Y = '100px';
const SHADOW_OFFSET_Y = '18px';
/** Контент победы показываем после того, как баннер вылетел (закончил анимацию появления). */
const VICTORY_CONTENT_DELAY = 0;

/**
 * Первая волна: тайтл + нижняя Lottie. Крути под себя.
 * delay — когда стартовать (можно меньше 0.9, чтобы начать пока ещё летит баннер).
 * titleDuration / bottomLottieDuration — медленнее = плавнее.
 * topBlockDelay — через сколько сек после первой волны показывать ball+avatar.
 */
export const VICTORY_FIRST_WAVE = {
  delay: 0.55,
  titleDuration: 0.72,
  bottomLottieDuration: 0.58,
  topBlockDelay: 0.35,
} as const;

const victoryFirstWaveDelay = VICTORY_FIRST_WAVE.delay;
const victoryTopWaveDelay = VICTORY_FIRST_WAVE.delay + VICTORY_FIRST_WAVE.topBlockDelay;

/**
 * Анимация аватара (момент «разделения шарика» в ball.json) — крути значения под свой тайминг.
 * 1) avatarDelay — задержка (сек) до появления аватара с ником.
 * 2) avatarStartY — стартовая позиция по вертикали (px).
 * 3) avatarEndY — конечная позиция по вертикали (px).
 */
export const VICTORY_AVATAR_ANIMATION = {
  avatarDelay: 1.8,
  avatarStartY: -30,
  avatarEndY: 0,
} as const;

/** Размеры: ball.json и круглый аватар в блоке победы */
const VICTORY_BALL_SIZE = 200;

const easeSmooth = [0.22, 1, 0.36, 1] as const;

const frontVariants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.8, ease: easeSmooth },
  },
  exit: {
    clipPath: 'inset(0 0 0 100%)',
    transition: { duration: 0.5, ease: easeSmooth },
  },
};

const backVariants = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.9, delay: 0.05, ease: easeSmooth },
  },
  exit: {
    clipPath: 'inset(0 100% 0 0)',
    transition: { duration: 0.5, ease: easeSmooth },
  },
};

export function SplashScreen({
  type,
  onClose,
  countdownSeconds: countdownSecondsProp,
  countdownLabel: countdownLabelProp,
  title: titleProp,
  subtitle: subtitleProp,
  static: staticProp,
  showContinueButton = false,
  eventAt: eventAtProp,
  endsAt: endsAtProp,
  players = [],
  spyIds,
  eliminatedPlayer,
  eliminatedWasSpy,
  eliminatedVotePercent,
}: SplashScreenProps) {
  const config = SPLASH_CONFIG[type];
  const content = SPLASH_CONTENT[type];
  const isStatic = staticProp ?? config.static;
  const countdownSeconds = (() => {
    if (countdownSecondsProp != null && countdownSecondsProp > 0) return countdownSecondsProp;
    if (type === 'voting_kicked_civilian' || type === 'spy_kill') return 10;
    return config.defaultCountdown ?? 0;
  })();
  const countdownLabel =
    countdownLabelProp ?? config.countdownLabel ?? '';
  const hasCountdown = countdownSeconds > 0 && !isStatic;

  const title = titleProp ?? content.title;
  const subtitle = subtitleProp ?? content.subtitle ?? '';

  const isVictoryType = VICTORY_TYPES.includes(type);
  const isProfileType = PROFILE_TYPES.includes(type);
  const spyPlayer = useMemo(() => {
    if (!isProfileType || !players?.length) return null;
    if (type === 'voting_kicked_civilian' && eliminatedPlayer) return null;
    if (spyIds?.length) {
      const found = players.find((p) => spyIds.includes(p.id));
      return found ?? null;
    }
    return pickRandomSpy(players);
  }, [isProfileType, type, players, spyIds, eliminatedPlayer]);
  const eliminatedRoleLabel =
    type === 'voting_kicked_civilian' && eliminatedPlayer
      ? (eliminatedWasSpy ? 'Шпион' : 'Мирный агент')
      : 'Мирный агент';
  const profilePlayer = (type === 'voting_kicked_civilian' || type === 'spy_kill') && eliminatedPlayer
    ? { id: '', nickname: eliminatedPlayer.nickname, avatar_id: eliminatedPlayer.avatar_id }
    : spyPlayer;
  const victoryBottomLottie = useMemo(() => {
    if (!isVictoryType || (type !== 'game_over_spy_win' && type !== 'game_over_spy_win_voting' && type !== 'game_over_civilians_win')) return null;
    const list = VICTORY_LOTTIE_BOTTOM[type];
    return list[Math.floor(Math.random() * list.length)] ?? list[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- eventAtProp forces re-pick on new splash events
  }, [isVictoryType, type, eventAtProp]);

  const deathLottie = useMemo(() => {
    if (type !== 'spy_kill') return null;
    if (!DEATH_LOTTIES.length) return null;
    const index = Math.floor(Math.random() * DEATH_LOTTIES.length);
    return DEATH_LOTTIES[index] ?? DEATH_LOTTIES[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- eventAtProp forces re-pick on new splash events
  }, [type, eventAtProp]);

  const initialCount = (() => {
    if (!hasCountdown) return countdownSeconds;

    // Приоритет: если сервер дал endsAt — считаем строго от него
    if (endsAtProp) {
      const diffSec = Math.floor(
        (new Date(endsAtProp).getTime() - Date.now()) / 1000
      );
      return diffSec > 0 ? diffSec : 0;
    }

    // Иначе fallback: eventAt + countdownSeconds (старое поведение)
    if (!eventAtProp) return countdownSeconds;

    const elapsed = Math.floor(
      (Date.now() - new Date(eventAtProp).getTime()) / 1000
    );
    const remaining = countdownSeconds - (elapsed < 0 ? 0 : elapsed);
    return remaining > 0 ? remaining : 0;
  })();

  const [count, setCount] = useState(initialCount);
  const [showCountdownNumber, setShowCountdownNumber] = useState(false);
  const prevCountRef = useRef(initialCount);
  const countdownClosedRef = useRef(false);
  const handleClose = useCallback(() => {
    if (!isStatic && onClose) {
      playVFX('woosh_out');
      onClose();
    }
  }, [isStatic, onClose]);

  const handleCloseWithWoosh = useCallback(() => {
    playVFX('woosh_out');
    onClose?.();
  }, [onClose]);

  // Woosh на вылет баннера (все типы)
  useEffect(() => {
    playVFX('woosh_in');
  }, []);

  // Победа: два звука при появлении контента
  useEffect(() => {
    if (!isVictoryType) return;
    playVFX('victory');
    const t = setTimeout(() => playVFX('cartoon_explosion_poof'), 120);
    return () => clearTimeout(t);
  }, [isVictoryType]);

  // Выгнали мирного: lose
  useEffect(() => {
    if (type !== 'voting_kicked_civilian') return;
    playVFX('lose');
  }, [type]);

  // Убийство: head-gore-explosion и liquid-or-blood
  useEffect(() => {
    if (type !== 'spy_kill') return;
    playVFX('head_gore_explosion');
    const t = setTimeout(() => playVFX('liquid_or_blood'), 150);
    return () => clearTimeout(t);
  }, [type]);

  // ball.json: звук при появлении шарика (все профильные баннеры)
  useEffect(() => {
    if (!isProfileType) return;
    const delayMs = Math.round((victoryFirstWaveDelay + VICTORY_FIRST_WAVE.topBlockDelay) * 500);
    const t = setTimeout(() => playVFX('ball_win'), delayMs);
    return () => clearTimeout(t);
  }, [isProfileType]);

  // Цифру монтируем только после задержки 0.85s, чтобы 5 появлялась «из пустоты», а не была уже отрисована
  useEffect(() => {
    if (!hasCountdown) return;
    const t = setTimeout(() => {
      setShowCountdownNumber(true);
      playVFX('countdown_sec');
    }, 850);
    return () => clearTimeout(t);
  }, [hasCountdown]);

  // Звук на каждую секунду счётчика: countdown_sec на 5,4,3,2,1 и countdown_last на 0
  useEffect(() => {
    if (!hasCountdown || !showCountdownNumber) return;
    if (count < prevCountRef.current) {
      if (count === 0) playVFX('countdown_last');
      else playVFX('countdown_sec');
    }
    prevCountRef.current = count;
  }, [hasCountdown, showCountdownNumber, count]);

  // Обратный отсчёт: стартуем только после появления цифры (0.85s), чтобы 5 была видна полную секунду
  useEffect(() => {
    if (!hasCountdown) return;
    if (count <= 0) {
      if (!countdownClosedRef.current) {
        countdownClosedRef.current = true;
        const t = setTimeout(() => {
          playVFX('woosh_out');
          onClose?.();
        }, 800);
        return () => clearTimeout(t);
      }
      return undefined;
    }
    if (!showCountdownNumber) return; // интервал только после появления первой цифры
    const t = setInterval(() => {
      setCount((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [hasCountdown, showCountdownNumber, count, onClose]);

  const colors = config.colors;
  const clickable = !isStatic && !hasCountdown;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`${styles.overlay} ${clickable ? styles.overlayClickable : ''}`}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      onClick={clickable ? handleClose : undefined}
    >
      <div className={styles.inner}>
        {/* Блок постоянной высоты: позиция баннера не зависит от наличия кнопки */}
        <div className={styles.splashContent}>
          <div className={styles.bannerSlot}>
            {/* Баннер: только наклонённые слои, без контента победы */}
            <div
              className={styles.wrapper}
              onClick={(e) => e.stopPropagation()}
              style={
                {
                  '--splash-front': colors.front,
                  '--splash-back': colors.back,
                } as React.CSSProperties
              }
            >
              {/* Задний слой: подпись/таймер (для победы пусто) */}
              <motion.div
                className={styles.backLayer}
                variants={backVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  transform: `translateY(${OFFSET_Y}) rotate(${FRONT_ANGLE + BACK_ANGLE_OFFSET}deg)`,
                }}
              >
                {isVictoryType ? null : (hasCountdown || subtitle) ? (
                  <motion.div
                    className={`${styles.backLayerText} ${hasCountdown ? styles.countdownRow : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: {
                        delay: hasCountdown ? 0 : 0.4,
                        duration: 0.3,
                      },
                    }}
                    exit={{ opacity: 0 }}
                    style={{
                      transform: `rotate(${-(FRONT_ANGLE + BACK_ANGLE_OFFSET)}deg)`,
                    }}
                  >
                    {hasCountdown ? (
                      <>
                        <span className={styles.countdownLabel}>{countdownLabel}</span>
                        <motion.span
                          className={styles.countdownNumberWrap}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                            transition: { delay: 0.85, duration: 0.25 },
                          }}
                          exit={{ opacity: 0 }}
                        >
                          {showCountdownNumber && (
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={count}
                                className={styles.countdownNumber}
                                initial={{ scale: 0.35, opacity: 0 }}
                                animate={{
                                  scale: 1,
                                  opacity: 1,
                                  transition: { type: 'spring', stiffness: 380, damping: 22 },
                                }}
                                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                              >
                                {count}
                              </motion.span>
                            </AnimatePresence>
                          )}
                        </motion.span>
                      </>
                    ) : (
                      subtitle
                    )}
                  </motion.div>
                ) : null}
              </motion.div>

            {/* Слой-тень: дубликат передней плашки, тёмный + blur + смещён вниз */}
            <motion.div
              className={styles.frontLayerShadow}
              variants={frontVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                transform: `translateY(${SHADOW_OFFSET_Y}) rotate(${FRONT_ANGLE}deg)`,
              }}
              aria-hidden
            />

            {/* Передний слой (всегда под наклоном); для профильных типов контент уже в отдельном слое поверх */}
            <motion.div
              className={styles.frontLayer}
              variants={frontVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transform: `rotate(${FRONT_ANGLE}deg)` }}
            >
              {/* Кровь только для spy_kill: внутри слоя, обрезается overflow hidden, под контентом */}
              {type === 'spy_kill' && (
                <div className={styles.frontLayerBloodWrap} aria-hidden>
                  <LottieIcon src={BLOOD_LOTTIE} autoplayOnce size={600} />
                </div>
              )}
              {!isProfileType && (
                <motion.div
                  className={styles.frontLayerContent}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.3, duration: 0.4 },
                  }}
                  exit={{ opacity: 0, x: 50 }}
                  style={{ transform: `rotate(${-FRONT_ANGLE}deg)` }}
                >
                  <h1 className={styles.title}>{title}</h1>
                </motion.div>
              )}
            </motion.div>
            </div>

            {/* Конфетти поверх всех слоёв (только для победных баннеров) */}
            {(type === 'game_over_spy_win' || type === 'game_over_spy_win_voting' || type === 'game_over_civilians_win') && (
              <div className={styles.victoryConfettiOverlay} aria-hidden>
                <LottieIcon src={VICTORY_LOTTIE_CONFETTI} autoplayOnce size={800} />
              </div>
            )}

            {/* Контент победы/профиля — отдельно поверх баннера, рисуется после вылета баннера */}
            {isProfileType && (
              <motion.div
                className={styles.victoryContentOverlay}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { delay: VICTORY_CONTENT_DELAY, duration: 0.35 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <div
                  className={`${styles.frontLayerContentVictory} ${type === 'spy_kill' ? styles.spyKillBanner : ''}`}
                >
                  {/* Визуально: ball+avatar сверху, тайтл, нижняя Lottie. Появление: тайтл и Lottie первыми, потом ball+avatar. */}
                  <motion.div
                    className={styles.victoryTop}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: { delay: victoryTopWaveDelay, duration: 0.28 },
                    }}
                    exit={{ opacity: 0 }}
                  >
                    <LottieIcon src={VICTORY_LOTTIE_TOP} autoplayOnce size={VICTORY_BALL_SIZE} />
                    {profilePlayer && (
                      <motion.div
                        className={styles.victorySpyBlock}
                        initial={{
                          opacity: 0,
                          scale: 0,
                          y: VICTORY_AVATAR_ANIMATION.avatarStartY,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: VICTORY_AVATAR_ANIMATION.avatarEndY,
                          transition: {
                            delay: VICTORY_AVATAR_ANIMATION.avatarDelay,
                            duration: 0.45,
                            ease: [0.34, 1.56, 0.64, 1],
                          },
                        }}
                      >
                        <div className={styles.victorySpyAvatarWrap}>
                          <PlayerAvatar
                            avatarId={profilePlayer.avatar_id}
                            size="lg"
                            className={styles.victorySpyAvatar}
                          />
                        </div>
                        <span className={styles.victorySpyNickname}>{profilePlayer.nickname}</span>
                        <span className={styles.victorySpyLabel}>
                          {type === 'spy_kill'
                            ? 'БЫЛ УБИТ ШПИОНОМ'
                            : type === 'voting_kicked_civilian'
                            ? eliminatedRoleLabel.toUpperCase()
                            : 'ШПИОН'}
                        </span>
                        {type === 'voting_kicked_civilian' && eliminatedVotePercent != null && (
                          <span className={styles.votingVotePercent}>
                            Набрал {eliminatedVotePercent}% голосов
                          </span>
                        )}
                      </motion.div>
                    )}
                  </motion.div>

                  {type === 'spy_kill' ? (
                    <motion.div
                      initial={{ opacity: 0, x: -72, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: {
                          delay: victoryFirstWaveDelay,
                          duration: VICTORY_FIRST_WAVE.titleDuration,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }}
                      exit={{ opacity: 0 }}
                    >
                      {deathLottie && (
                        <LottieIcon key={deathLottie} src={deathLottie} loop size={200} />
                      )}
                    </motion.div>
                  ) : (
                    <motion.h1
                      className={`${styles.titleVictory} ${
                        type === 'voting_kicked_civilian' ? styles.votingTitle : ''
                      }`}
                      initial={{ opacity: 0, x: -72 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        transition: {
                          delay: victoryFirstWaveDelay,
                          duration: VICTORY_FIRST_WAVE.titleDuration,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }}
                      exit={{ opacity: 0 }}
                    >
                      {type === 'voting_kicked_civilian' ? (
                        <>
                          <span className={styles.votingTitleDesktop}>{title}</span>
                          <span className={styles.votingTitleMobile}>
                            <span>БЫЛ ИЗГНАН</span>
                            <br />
                            <span>ГОЛОСОВАНИЕМ</span>
                          </span>
                        </>
                      ) : (
                        title
                      )}
                    </motion.h1>
                  )}
                  {/* Нижний блок: у победных — Lottie, у "выгнали мирного"/"убийство" — просто пустой слот той же высоты */}
                  {isProfileType && (
                    <motion.div
                      className={styles.victoryBottomLottieWrap}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: {
                          delay: victoryFirstWaveDelay,
                          duration: VICTORY_FIRST_WAVE.bottomLottieDuration,
                          ease: [0.34, 1.56, 0.64, 1],
                        },
                      }}
                      exit={{ opacity: 0 }}
                    >
                      {type !== 'voting_kicked_civilian' && type !== 'spy_kill' && victoryBottomLottie && (
                        <LottieIcon key={victoryBottomLottie} src={victoryBottomLottie} loop size={180} />
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          {(type === 'system_pause' || VICTORY_TYPES.includes(type)) &&
            onClose &&
            showContinueButton && (
            <div className={styles.continueWrap}>
              <PrimaryButtonLobby
                onClick={handleCloseWithWoosh}
                soundClick="click"
                soundHover="hover"
              >
                {type === 'system_pause' ? 'ПРОДОЛЖИТЬ' : 'ЗАВЕРШИТЬ ИГРУ'}
              </PrimaryButtonLobby>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export type { SplashScreenProps, SplashType } from './types';
