'use client';

import { useState } from 'react';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import { LottieIcon } from '@/components/ui/LottieIcon';
import type { Player } from '@/types/player';
import { playUI } from '@/lib/sound';
import styles from './HostPanelPlayerList.module.css';

type HostPanelPlayerListProps = {
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  kickingPlayerId?: string | null;
};

export function HostPanelPlayerList({
  players,
  currentPlayerId,
  isHost,
  onKick,
  kickingPlayerId,
}: HostPanelPlayerListProps) {
  return (
    <div className={styles.list}>
      {players.map((player) => {
        const isMe = player.id === currentPlayerId;
        const canKick = isHost && !isMe && !player.is_host;
        const isKicking = kickingPlayerId === player.id;

        return (
          <HostPanelPlayerItem
            key={player.id}
            player={player}
            isMe={isMe}
            isPlayerHost={player.is_host}
            canKick={canKick}
            isKicking={isKicking}
            onKick={onKick}
          />
        );
      })}
    </div>
  );
}

function HostPanelPlayerItem({
  player,
  isMe,
  isPlayerHost,
  canKick,
  isKicking,
  onKick,
}: {
  player: Player;
  isMe: boolean;
  isPlayerHost: boolean;
  canKick: boolean;
  isKicking: boolean;
  onKick?: (playerId: string) => void;
}) {
  const [kickHovered, setKickHovered] = useState(false);

  return (
    <div
      className={styles.item}
      onMouseEnter={() => playUI('hover')}
      onClick={() => playUI('click')}
    >
      <div className={styles.avatar}>
        <PlayerAvatar avatarId={player.avatar_id} size="md" className={styles.avatarImg} />
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.nickname}>{player.nickname}</span>
          <span className={styles.labels}>
            {isPlayerHost && (
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
          </span>
        </div>
      </div>
      {canKick && onKick && (
        <button
          type="button"
          className={styles.kickBtn}
          onClick={() => {
            playUI('click');
            onKick(player.id);
          }}
          disabled={isKicking}
          onMouseEnter={() => {
            setKickHovered(true);
            playUI('hover');
          }}
          onMouseLeave={() => setKickHovered(false)}
        >
          <LottieIcon src="/lottie/cross.json" size={18} playOnHover hovered={kickHovered} />
        </button>
      )}
    </div>
  );
}
