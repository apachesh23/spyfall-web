'use client';

import { useEffect, useRef, useState } from 'react';
import { PlayerItem } from './PlayerItem';
import { useReactions } from '@/contexts/ReactionsContext';
import type { Player } from '@/types/player';
import styles from './PlayerList.module.css';

const COMPACT_LAYOUT_QUERY: Record<'lobby' | 'game', string> = {
  lobby: '(max-width: 1024px)',
  game: '(max-width: 1270px)',
};

function useCompactPlayerListLayout(layout: 'lobby' | 'game'): boolean {
  const query = COMPACT_LAYOUT_QUERY[layout];
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

type PlayerListProps = {
  players: Player[];
  currentPlayerId: string | null;
  onlinePlayers: Set<string>;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  kickingPlayerId?: string | null;
  /** В игре: id изгнанных игроков (карточка полупрозрачная + подпись). Игроки могут иметь death_reason для «Убит» vs «Изгнан». */
  eliminatedPlayerIds?: Set<string>;
  /** Лобби: компактный список с ≤1024px; игра: сетка игры переключается на ≤1270px. */
  layout?: 'lobby' | 'game';
};

export function PlayerList({
  players,
  currentPlayerId,
  onlinePlayers,
  isHost,
  onKick,
  kickingPlayerId,
  eliminatedPlayerIds,
  layout = 'lobby',
}: PlayerListProps) {
  const reactions = useReactions();
  const activeReactions = reactions?.activeReactions ?? [];
  const isCompactLayout = useCompactPlayerListLayout(layout);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const prevReactionIdsRef = useRef<Set<string>>(new Set());

  const minPlayers = 3;
  const placeholdersNeeded = Math.max(0, minPlayers - players.length);

  // На мобилке при новой реакции скроллим только список игроков (не всю страницу)
  useEffect(() => {
    if (!isCompactLayout || activeReactions.length === 0) return;
    const currentIds = new Set(activeReactions.map((r) => r.id));
    const newReaction = activeReactions.find((r) => !prevReactionIdsRef.current.has(r.id));
    prevReactionIdsRef.current = currentIds;
    if (newReaction) {
      const container = listScrollRef.current;
      const el = container?.querySelector(
        `[data-player-id="${newReaction.playerId}"]`
      ) as HTMLElement | null;
      if (container && el) {
        const containerWidth = container.clientWidth;
        const elLeft = el.offsetLeft;
        const elWidth = el.offsetWidth;
        const maxScroll = container.scrollWidth - containerWidth;
        const targetScrollLeft = Math.max(
          0,
          Math.min(maxScroll, elLeft - containerWidth / 2 + elWidth / 2)
        );
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeReactions, isCompactLayout]);

  return (
    <div className={styles.list} data-list-layout={layout}>
      <div ref={listScrollRef} className={styles.listScroll}>
        {/* Рендерим реальных игроков */}
        {players.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isOnline = onlinePlayers.has(player.id);
          const canKick = isHost && !isMe && !player.is_host;
          const isKicking = kickingPlayerId === player.id;
          const activeReaction = activeReactions.find((r) => r.playerId === player.id) ?? null;

          const isEliminated = eliminatedPlayerIds?.has(player.id);
          const deathReason = (player as { death_reason?: string | null }).death_reason ?? null;

          return (
            <div key={player.id} data-player-id={player.id} className={styles.playerItemWrap}>
              <PlayerItem
                player={player}
                isMe={isMe}
                isOnline={isOnline}
                isHost={player.is_host}
                canKick={canKick}
                isKicking={isKicking}
                onKick={onKick}
                activeReaction={activeReaction}
                isEliminated={isEliminated}
                deathReason={deathReason}
                listLayout={layout}
              />
            </div>
          );
        })}

        {/* Рендерим заглушки */}
        {Array.from({ length: placeholdersNeeded }).map((_, idx) => (
          <div key={`placeholder-${idx}`} className={styles.placeholder}>
            <div className={styles.placeholderCircle} />
            {/* Текст показываем только в первой пустой ячейке, чтобы не дублировать */}
            {idx === 0 && (
              <p className={styles.hint}>
                Минимум 3 игрока<br/>для старта
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}