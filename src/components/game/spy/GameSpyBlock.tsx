'use client';

import { useState, useEffect } from 'react';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { SpyActionButton } from './SpyActionButton';
import { SpyGuessLocationModal } from './SpyGuessLocationModal';
import { SpyEliminateModal } from './SpyEliminateModal';
import type { GamePlayer } from '@/types';
import styles from './GameSpyBlock.module.css';

type GameSpyBlockProps = {
  onGuess?: (locationName: string) => void;
  /** Режим «Скрытая угроза»: шпион может либо угадать, либо устранить один раз за раунд. */
  modeHiddenThreat?: boolean;
  players: GamePlayer[];
  onEliminate?: (playerId: string) => void;
  /** Уже использованное действие в этом раунде: после этого обе кнопки блокируются. */
  spyActionType?: 'guess' | 'kill' | null;
  /** Момент разблокировки KILL (ISO) с сервера — переживает паузы и перезагрузку. */
  killUnlockAt?: string | null;
  /** Режим предпросмотра: только UI, без открытия модалок/действий. */
  previewMode?: boolean;
};

export function GameSpyBlock({
  onGuess,
  modeHiddenThreat = false,
  players,
  onEliminate,
  spyActionType = null,
  killUnlockAt = null,
  previewMode = false,
}: GameSpyBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [eliminateOpen, setEliminateOpen] = useState(false);

  const aliveCount = players.filter((p) => p.is_alive).length;
  const [killRemainingMs, setKillRemainingMs] = useState<number | null>(null);

  // Отсчёт до разблокировки KILL по серверному kill_unlock_at (не сбрасывается при перезагрузке)
  useEffect(() => {
    if (!killUnlockAt) {
      setKillRemainingMs(null);
      return;
    }
    const unlockTs = new Date(killUnlockAt).getTime();
    if (Number.isNaN(unlockTs)) {
      setKillRemainingMs(null);
      return;
    }

    const update = () => {
      const remaining = unlockTs - Date.now();
      setKillRemainingMs(remaining > 0 ? remaining : 0);
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [killUnlockAt]);

  const anyActionUsed = spyActionType != null;
  const canGuess = !anyActionUsed;

  const killLockedByTime = killRemainingMs != null && killRemainingMs > 0;
  const killUnavailableByPlayers = aliveCount <= 3;
  const canKill =
    modeHiddenThreat &&
    aliveCount > 3 &&
    !!onEliminate &&
    !anyActionUsed &&
    !killLockedByTime;
  const killUseGlassStyle = killUnavailableByPlayers || (!anyActionUsed && killLockedByTime);

  const subtitle = modeHiddenThreat
    ? 'Вы можете выполнить только одно действие за раунд.'
    : 'Назвать локацию можно только один раз за раунд.';

  const formatMsToTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mm = m.toString();
    const ss = s.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const guessStatusLabel = anyActionUsed ? '✅ Использовано' : '⚡ Доступно';

  let killStatusLabel = '⚡ Доступно';
  if (killUnavailableByPlayers) {
    killStatusLabel = '🚫 Недостаточно игроков';
  } else if (anyActionUsed) {
    killStatusLabel = '✅ Использовано';
  } else if (killLockedByTime && killRemainingMs != null) {
    killStatusLabel = `🕒 через ${formatMsToTime(killRemainingMs)}`;
  }

  return (
    <>
      <div
        className={`glass ${styles.block} ${previewMode ? styles.blockPreview : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={styles.left}>
          <div className={styles.iconMain}>
            <LottieIcon
              src="/lottie/spy-action.json"
              size={40}
              playOnHover
              hovered={hovered}
            />
          </div>
          <div className={styles.textBlock}>
            <h2 className={styles.title}>ДЕЙСТВИЕ ШПИОНА</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.buttons}>
          <SpyActionButton
            onClick={() => !previewMode && canGuess && setModalOpen(true)}
            soundClick="click"
            soundHover="hover"
            noIcon
            className={`${styles.button} ${styles.guessButton} ${anyActionUsed ? styles.buttonUsed : ''}`}
            disabled={!canGuess}
          >
            <span className={styles.buttonText}>
              <span className={styles.buttonTitle}>НАЗВАТЬ ЛОКАЦИЮ</span>
              <span
                className={`${styles.buttonStatus} ${
                  anyActionUsed ? styles.buttonStatusUsed : styles.buttonStatusAvailable
                }`}
              >
                {guessStatusLabel}
              </span>
            </span>
          </SpyActionButton>

          {modeHiddenThreat && (
            <SpyActionButton
              onClick={() => !previewMode && canKill && setEliminateOpen(true)}
              soundClick="click"
              soundHover="hover"
              noIcon
              className={`${styles.button} ${
                killUseGlassStyle ? `${styles.killButtonLocked} glass glass-hover` : styles.killButton
              } ${anyActionUsed && !killUnavailableByPlayers ? styles.buttonUsed : ''}`}
              disabled={!canKill}
            >
              <span className={styles.buttonText}>
                <span className={styles.buttonTitle}>УСТРАНИТЬ</span>
                <span
                  className={`${styles.buttonStatus} ${
                    killUnavailableByPlayers
                      ? styles.buttonStatusUnavailable
                      : anyActionUsed
                      ? styles.buttonStatusUsed
                      : killLockedByTime
                      ? styles.buttonStatusTimer
                      : styles.buttonStatusAvailable
                  }`}
                >
                  {killStatusLabel}
                </span>
              </span>
            </SpyActionButton>
          )}
        </div>
      </div>

      {!previewMode && (
        <SpyGuessLocationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onGuess={onGuess}
        />
      )}

      {!previewMode && modeHiddenThreat && (
        <SpyEliminateModal
          open={eliminateOpen}
          onClose={() => setEliminateOpen(false)}
          players={players}
          onEliminate={(id) => {
            onEliminate?.(id);
          }}
        />
      )}
    </>
  );
}
