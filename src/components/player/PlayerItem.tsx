'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerAvatar } from './PlayerAvatar';
import { LottieIcon } from '@/components/ui/LottieIcon';
import type { Player } from '@/types/player';
import type { ActiveReaction } from '@/contexts/ReactionsContext';
import { playUI } from '@/lib/sound';
import styles from './PlayerItem.module.css';

const REACTION_LIFETIME_S = 3;

type PlayerItemProps = {
  player: Player;
  isMe: boolean;
  isOnline: boolean;
  isHost: boolean;
  canKick: boolean;
  isKicking: boolean;
  onKick?: (playerId: string) => void;
  /** Реакция, показываемая на аватарке (вылет из центра, 3 сек) */
  activeReaction?: ActiveReaction | null;
  /** В игре: игрок изгнан (карточка полупрозрачная, справа подпись) */
  isEliminated?: boolean;
  /** Причина выхода: 'killed' → «Убит», иначе при isEliminated → «Изгнан» */
  deathReason?: string | null;
  /** Согласован с брейкпоинтом списка: lobby 1024px, game 1270px */
  listLayout?: 'lobby' | 'game';
};

export function PlayerItem({
  player,
  isMe,
  isOnline,
  isHost,
  canKick,
  isKicking,
  onKick,
  activeReaction,
  isEliminated = false,
  deathReason = null,
  listLayout = 'lobby',
}: PlayerItemProps) {
  const [hovered, setHovered] = useState(false);
  const [kickHovered, setKickHovered] = useState(false);

  // Для лобби: кик доступен на десктопе через вертикальный список, показываем только при hover
  const showKickBtn = canKick && !!onKick && hovered && !isEliminated;

  return (
    <div
      className={`${styles.card} ${isEliminated ? styles.cardEliminated : ''}`}
      data-list-layout={listLayout}
      onMouseEnter={() => {
        setHovered(true);
        playUI('hover');
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => playUI('click')}
    >
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          <PlayerAvatar avatarId={player.avatar_id} size="md" className={styles.avatarImg} />
          <span
            className={`${styles.statusDot} ${
              isOnline ? styles.statusDotOnline : styles.statusDotOffline
            }`}
          />
          <AnimatePresence>
            {activeReaction && (
              <motion.div
                key={activeReaction.id}
                className={styles.reactionOverlay}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 1, 1],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: REACTION_LIFETIME_S,
                  times: [0, 0.1, 0.85, 1],
                }}
              >
                <LottieIcon
                  src={`/lottie/reactions/reaction${activeReaction.reactionId}.json`}
                  autoplayOnce
                  size={56}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isEliminated && (
              <motion.div
                key="kill-animation"
                className={styles.eliminatedOverlay}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
                }}
              >
                <LottieIcon
                  src="/lottie/kill.json"
                  size={48}
                  autoplayOnce
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.name}>
          <span className={styles.nickname}>{player.nickname}</span>
          <span className={styles.nameLabels}>
            {isHost && (
              <span className={styles.hostIcon}>
                <LottieIcon
                  src="/lottie/crown.json"
                  loop
                  size={16}
                />
              </span>
            )}
            {isMe && (
              <span className={styles.labelYou}>
                <LottieIcon src="/lottie/crystall.json" size={14} loop />
                <span>You</span>
              </span>
            )}
            {isEliminated && (
              <span className={styles.eliminatedLabelMobile}>
                <span className={styles.eliminatedLabel}>
                  {deathReason === 'killed' ? 'Убит' : 'Изгнан'}
                </span>
              </span>
            )}
          </span>
        </div>
      </div>

      {isEliminated && (
        <div className={`${styles.rightSlot} ${styles.rightSlotEliminated}`}>
          <span className={styles.eliminatedLabel}>{deathReason === 'killed' ? 'Убит' : 'Изгнан'}</span>
        </div>
      )}

      {showKickBtn && (
        <div className={styles.rightSlot}>
          <button
            type="button"
            className={styles.kickBtn}
            onClick={() => {
              playUI('click');
              onKick?.(player.id);
            }}
            disabled={isKicking}
            onMouseEnter={() => {
              setKickHovered(true);
              playUI('hover');
            }}
            onMouseLeave={() => setKickHovered(false)}
          >
            <LottieIcon
              src="/lottie/cross.json"
              size={18}
              playOnHover
              hovered={kickHovered}
            />
          </button>
        </div>
      )}
    </div>
  );
}