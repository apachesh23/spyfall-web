// /app/room/[code]/page.tsx
// Lobby (ожидание игроков)
// Использует обновлённый PlayerList

'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRoomData } from '@/hooks/room/useRoomData';
import { useRealtimeChannel } from '@/hooks/room/useRealtimeChannel';
import { InviteLink } from '@/components/room/InviteLink';
import { RoomSettings } from '@/components/room/RoomSettings';
import { PlayerList } from '@/components/player/PlayerList';
import { StartGameButton } from '@/components/room/StartGameButton';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  
  const {
    players,
    setPlayers,
    roomId,
    loading,
    error,
    currentPlayerId,
    isHost,
    settings,
    setSettings,
  } = useRoomData(code);

  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState(false);

  useRealtimeChannel({
    roomId,
    code,
    playerId: currentPlayerId,
    setPlayers,
    setSettings,
    setOnlinePlayers,
  });

  async function kickPlayer(playerId: string) {
    if (!roomId || !currentPlayerId || !confirm('Кикнуть игрока?')) return;
    
    setKickingPlayerId(playerId);
    try {
      const response = await fetch('/api/rooms/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, roomId, kickerId: currentPlayerId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    } finally {
      setKickingPlayerId(null);
    }
  }

  async function saveSettings() {
    if (!roomId || !currentPlayerId) return;
    
    try {
      const response = await fetch('/api/rooms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId, settings }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  async function startGame() {
    if (!roomId || !currentPlayerId) return;
    
    if (players.length < 3) {
      alert('Минимум 3 игрока для старта!');
      return;
    }

    setStartingGame(true);
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Ошибка старта игры');
        setStartingGame(false);
      }
      // postgres_changes сделает редирект на /game
    } catch (err) {
      console.error(err);
      alert('Ошибка старта игры');
      setStartingGame(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Ошибка</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🕵️ Лобби игры
          </h1>
          <InviteLink code={code} />
        </div>

        {/* Основной контент */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Левая колонка - Игроки */}
          <div className="bg-white rounded-lg shadow p-6">
            <PlayerList 
              players={players}
              currentPlayerId={currentPlayerId}
              onlinePlayers={onlinePlayers}
              isHost={isHost}
              onKick={kickPlayer}
              kickingPlayerId={kickingPlayerId}
            />
          </div>

          {/* Правая колонка - Настройки */}
          <div className="space-y-6">
            {settings && (
              <div className="bg-white rounded-lg shadow p-6">
                <RoomSettings
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={saveSettings}
                  isHost={isHost}
                />
              </div>
            )}

            {/* Кнопка старта */}
            {isHost && (
              <div className="bg-white rounded-lg shadow p-6">
                <StartGameButton
                  playerCount={players.length}
                  onStart={startGame}
                  starting={startingGame}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}