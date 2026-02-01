// /components/player/PlayerList.tsx
// Список игроков для Lobby
// Использует PlayerAvatar для отображения

'use client';

import { PlayerAvatar } from './PlayerAvatar';
import type { Player } from '@/types/player';

type PlayerListProps = {
  players: Player[];
  currentPlayerId: string | null;
  onlinePlayers: Set<string>;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  kickingPlayerId?: string | null;
};

export function PlayerList({ 
  players, 
  currentPlayerId, 
  onlinePlayers,
  isHost,
  onKick,
  kickingPlayerId 
}: PlayerListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        Игроки ({players.length})
      </h2>

      <div className="space-y-2">
        {players.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isOnline = onlinePlayers.has(player.id);
          const canKick = isHost && !isMe && !player.is_host;
          const isKicking = kickingPlayerId === player.id;

          return (
            <div
              key={player.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                transition-colors
                ${isMe 
                  ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Аватар игрока */}
              <div className="relative">
                <PlayerAvatar 
                  avatarId={player.avatar_id} 
                  size="md"
                  className={isMe ? 'ring-2 ring-blue-400' : ''}
                />
                
                {/* Online индикатор */}
                {isOnline && (
                  <div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                    title="Онлайн"
                  />
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 truncate">
                    {player.nickname}
                  </span>
                  
                  {player.is_host && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                      👑 Ведущий
                    </span>
                  )}
                  
                  {isMe && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      Вы
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-500 mt-0.5">
                  {isOnline ? '🟢 В сети' : '⚪ Не в сети'}
                </div>
              </div>

              {/* Кнопка кика */}
              {canKick && onKick && (
                <button
                  onClick={() => onKick(player.id)}
                  disabled={isKicking}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 rounded transition"
                >
                  {isKicking ? 'Удаление...' : 'Кикнуть'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Подсказка если мало игроков */}
      {players.length < 3 && (
        <p className="text-sm text-gray-500 text-center mt-4">
          Минимум 3 игрока для старта игры
        </p>
      )}
    </div>
  );
}