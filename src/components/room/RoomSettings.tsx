'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, Easing } from 'framer-motion';
import { LottieIcon } from '@/components/ui/LottieIcon';
import type { Settings } from '@/types';
import { useIsLobbyMobile } from '@/hooks/room/useIsLobbyMobile';
import { playUI } from '@/lib/sound';
import styles from './RoomSettings.module.css';

type RoomSettingsProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  isHost: boolean;
  playerCount: number;
};

/** 1–6: multi недоступен (1 шпион). 7–10: 2 шпиона. 11+: 3 шпиона. */
function getEffectiveSpyCount(modeMultiSpy: boolean, playerCount: number): number {
  if (!modeMultiSpy || playerCount < 7) return 1;
  return playerCount >= 11 ? 3 : 2;
}

const MODE_CARDS: Array<{
  key: keyof Settings;
  lottie: string;
  title: string;
  desc: string;
}> = [
  { key: 'mode_multi_spy', lottie: '/lottie/shadow_alliance.json', title: 'Сеть шпионов', desc: '7–10 игроков: 2 шпиона, 11+: 3 шпиона' },
  { key: 'mode_theme', lottie: '/lottie/theme-location.json', title: 'Тема локации', desc: 'Будет известна тема локации' },
  { key: 'mode_roles', lottie: '/lottie/role-location.json', title: 'Роли локации', desc: 'Добавить РП роли всем игрокам' },
  { key: 'mode_hidden_threat', lottie: '/lottie/hidden_threat.json', title: 'Скрытая угроза', desc: 'Шпион может убивать 1 раз за раунд (только при 1 шпионе)' },
  { key: 'mode_spy_chaos', lottie: '/lottie/chaos.json', title: 'Шпионский хаос', desc: 'Случайное кол-во шпионов от 1 до макс. (только с Сетью шпионов)' },
];

export function RoomSettings({ settings, onSettingsChange, isHost, playerCount }: RoomSettingsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const isLobbyMobile = useIsLobbyMobile();

  const [localSettings, setLocalSettings] = useState(settings);
  const [gameDurationInput, setGameDurationInput] = useState<string>(
    String(settings.game_duration),
  );
  const [voteDurationInput, setVoteDurationInput] = useState<string>(
    String(settings.vote_duration),
  );
  const lastUpdateFromParent = useRef(JSON.stringify(settings));

  const multiSpyAvailable = playerCount >= 7;
  const effectiveMultiSpy = localSettings.mode_multi_spy && multiSpyAvailable;
  const effectiveSpyCount = useMemo(
    () => getEffectiveSpyCount(localSettings.mode_multi_spy, playerCount),
    [localSettings.mode_multi_spy, playerCount],
  );
  const chaosAvailable = effectiveMultiSpy;
  const hiddenThreatAvailable = effectiveSpyCount === 1;

  /** Отображаемое значение шпионов: "1", "2", "3" или "1–2", "1–3" при хаосе */
  const spyCountDisplay =
    effectiveMultiSpy && localSettings.mode_spy_chaos
      ? `1–${effectiveSpyCount}`
      : String(effectiveSpyCount);

  useEffect(() => {
    const stringified = JSON.stringify(settings);
    if (stringified !== lastUpdateFromParent.current) {
      setLocalSettings(settings);
      setGameDurationInput(String(settings.game_duration));
      setVoteDurationInput(String(settings.vote_duration));
      lastUpdateFromParent.current = stringified;
    }
  }, [settings]);

  const handleToggle = (key: keyof Settings, value: boolean | number) => {
    if (!isHost) return;
    const newSettings = { ...localSettings, [key]: value };

    if (key === 'mode_multi_spy') {
      if (value) {
        if (!multiSpyAvailable) return;
        newSettings.spy_count = playerCount >= 11 ? 3 : 2;
        newSettings.mode_hidden_threat = false;
      } else {
        newSettings.spy_count = 1;
        newSettings.mode_spy_chaos = false;
      }
    }

    if (key === 'mode_spy_chaos' && value && !chaosAvailable) return;
    if (key === 'mode_hidden_threat' && value && !hiddenThreatAvailable) return;

    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isHost) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const commitNumericSetting = (key: keyof Settings, raw: string) => {
    if (!isHost) return;
    const trimmed = raw.trim();
    if (trimmed === '') {
      const current = localSettings[key] as number;
      if (key === 'game_duration') setGameDurationInput(String(current));
      if (key === 'vote_duration') setVoteDurationInput(String(current));
      return;
    }
    const num = Number(trimmed);
    if (Number.isNaN(num)) return;
    if (localSettings[key] === num) return;
    handleToggle(key, num);
  };

  // Явно указываем тип Easing для массива, чтобы убрать ошибку TS
  const customEase: Easing = [0.4, 0, 0.2, 1];
  const transition = { duration: 0.3, ease: customEase };

  const showFloatingTooltip = !isHost && !isLobbyMobile;

  return (
    <div 
      className={styles.grid} 
      onMouseMove={showFloatingTooltip ? handleMouseMove : undefined}
      onMouseEnter={showFloatingTooltip ? () => setShowTooltip(true) : undefined}
      onMouseLeave={showFloatingTooltip ? () => setShowTooltip(false) : undefined}
    >
      <AnimatePresence mode="wait">
        {showFloatingTooltip && showTooltip && (
          <motion.div 
            className={`glass ${styles.cursorTooltip}`}
            style={{ 
              left: mousePos.x + 15, 
              top: mousePos.y + 15,
              position: 'fixed' 
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            Только ведущий может менять настройки
          </motion.div>
        )}
      </AnimatePresence>

      {!isHost && isLobbyMobile && (
        <div className={`glass ${styles.cursorTooltipStatic}`}>
          Только ведущий может менять настройки
        </div>
      )}

      <div
        className={`glass ${styles.cardInput} ${!isHost ? styles.cardDisabled : ''}`}
        onMouseEnter={() => playUI('hover')}
        onClick={() => playUI('click')}
      >
        <span className={styles.cardInputTitle}>Время игры (мин)</span>
        <div className={styles.cardInputWrap}>
          <input
            type="number"
            value={gameDurationInput}
            onChange={(e) => {
              const val = e.target.value;
              if (!isHost) return;
              setGameDurationInput(val);
            }}
            onBlur={() => commitNumericSetting('game_duration', gameDurationInput)}
            readOnly={!isHost}
            className={`glass-input ${styles.cardInputValue}`}
            suppressHydrationWarning
          />
        </div>
      </div>

      <div
        className={`glass ${styles.cardInput} ${!isHost ? styles.cardDisabled : ''}`}
        onMouseEnter={() => playUI('hover')}
        onClick={() => playUI('click')}
      >
        <span className={styles.cardInputTitle}>Голосование (мин)</span>
        <div className={styles.cardInputWrap}>
          <input
            type="number"
            step={0.5}
            value={voteDurationInput}
            onChange={(e) => {
              const val = e.target.value;
              if (!isHost) return;
              setVoteDurationInput(val);
            }}
            onBlur={() => commitNumericSetting('vote_duration', voteDurationInput)}
            readOnly={!isHost}
            className={`glass-input ${styles.cardInputValue}`}
            suppressHydrationWarning
          />
        </div>
      </div>

      <div
        className={`glass ${styles.cardInput} ${!isHost ? styles.cardDisabled : ''}`}
        onMouseEnter={() => playUI('hover')}
        onClick={() => playUI('click')}
      >
        <span className={styles.cardInputTitle}>Шпионов в игре</span>
        <div className={styles.cardInputWrap}>
          <span className={styles.cardInputAuto}>{spyCountDisplay}</span>
        </div>
      </div>

      {MODE_CARDS.map(({ key, lottie, title, desc }) => {
        const isDisabled =
          !isHost ||
          (key === 'mode_multi_spy' && !multiSpyAvailable) ||
          (key === 'mode_spy_chaos' && !chaosAvailable) ||
          (key === 'mode_hidden_threat' && !hiddenThreatAvailable);
        const checked =
          key === 'mode_multi_spy' && !multiSpyAvailable ? false : !!localSettings[key];
        return (
        <label
          key={key}
          className={`glass glass-hover ${styles.cardMode} ${isDisabled ? styles.cardDisabled : ''}`}
          onMouseEnter={() => {
            setHoveredCard(key);
            if (!isDisabled) playUI('hover');
          }}
          onMouseLeave={() => setHoveredCard(null)}
          onClickCapture={() => {
            if (isDisabled) playUI('click');
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={isDisabled}
            onChange={(e) => {
              if (isDisabled) return;
              handleToggle(key, e.target.checked);
              playUI('toggle');
            }}
            className={styles.toggleInput}
          />
          <div className={styles.cardModeLottie}>
            <LottieIcon src={lottie} playOnHover hovered={hoveredCard === key} size={52} />
          </div>
          <div className={styles.cardModeContent}>
            <motion.span
              className={`${styles.cardModeText} ${styles.cardModeTextTitle}`}
              animate={{ y: hoveredCard === key ? -35 : 0, opacity: hoveredCard === key ? 0 : 1 }}
              transition={transition}
            >
              {title}
            </motion.span>
            <motion.span
              className={`${styles.cardModeText} ${styles.cardModeTextDesc}`}
              initial={{ y: 35, opacity: 0 }}
              animate={{ y: hoveredCard === key ? 0 : 35, opacity: hoveredCard === key ? 1 : 0 }}
              transition={transition}
            >
              {desc}
            </motion.span>
          </div>
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      );
      })}
    </div>
  );
}