// src/components/game/players/GamePlayerList.tsx - ИСПРАВЛЕНО

import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import type { GamePlayer } from '@/types';

type GamePlayerListProps = {
  players: GamePlayer[];  // ← ИСПРАВЛЕНО: было Player[]
  currentPlayerId: string | null;
  onlinePlayers: Set<string>;
};

export function GamePlayerList({ players, currentPlayerId, onlinePlayers }: GamePlayerListProps) {
  return (
    <div>
      <h2>Игроки ({players.filter(p => p.is_alive).length} живых):</h2>
      <ul>
        {players.map((player) => {
          const isOnline = onlinePlayers.has(player.id);
          const isMe = player.id === currentPlayerId;
          
          return (
            <li 
              key={player.id}
              style={{ 
                opacity: player.is_alive ? 1 : 0.4,
                textDecoration: player.is_alive ? 'none' : 'line-through',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px'
              }}
            >
              <PlayerAvatar avatarId={player.avatar_id} size="sm" />
              {player.nickname}
              {isMe && ' (ты)'}
              {isOnline ? ' 🟢' : ' 🔄'}
              {!player.is_alive && ' ☠️'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}