'use client';

import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { playUI } from '@/lib/sound';
import type { GamePlayer } from '@/types';
import styles from './VotingCard.module.css';

type VotingCardProps = {
  player: GamePlayer;
  isMe: boolean;
  isHost: boolean;
  hasVoted: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  /** Показать процент вместо иконки кулака (экран результата — победитель). */
  percentLabel?: string;
  /** Визуально приглушённая карточка (не кандидат в повторном голосовании). */
  dimmed?: boolean;
};

export function VotingCard({
  player,
  isMe,
  isHost,
  hasVoted,
  selected,
  disabled,
  onSelect,
  percentLabel,
  dimmed,
}: VotingCardProps) {
  return (
    <button
      type="button"
      className={`glass glass-hover ${styles.card} ${selected ? styles.cardSelected : ''} ${disabled ? styles.cardDisabled : ''} ${dimmed ? styles.cardDimmed : ''}`}
      onClick={() => {
        if (disabled) return;
        playUI('click');
        onSelect();
      }}
      onMouseEnter={() => !disabled && playUI('hover')}
      disabled={disabled}
    >
      <div className={styles.avatarWrap}>
        <PlayerAvatar avatarId={player.avatar_id} size="md" className={styles.avatar} />
      </div>
      <div className={styles.info}>
        <span className={styles.nameRow}>
          <span className={styles.nickname}>{player.nickname}</span>
          <span className={styles.labels}>
            {isHost && (
              <span className={styles.crown} aria-hidden>
                <LottieIcon src="/lottie/crown.json" loop size={16} />
              </span>
            )}
            {isMe && (
              <span className={styles.you}>
                <LottieIcon src="/lottie/crystall.json" size={14} loop />
                <span>You</span>
              </span>
            )}
          </span>
        </span>
      </div>
      <div className={styles.rightSlot}>
        {percentLabel != null ? (
          <span className={styles.percentLabel}>{percentLabel}</span>
        ) : hasVoted ? (
          <span className={styles.fistWrap} aria-hidden>
            <LottieIcon src="/lottie/fist.json" autoplayOnce size={32} />
          </span>
        ) : null}
      </div>
    </button>
  );
}
