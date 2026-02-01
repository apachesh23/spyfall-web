'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRoomData } from '@/hooks/room/useRoomData';
import { useRealtimeChannel } from '@/hooks/room/useRealtimeChannel';
import { InviteLink } from '@/components/room/InviteLink';
import { RoomSettings } from '@/components/room/RoomSettings';
import { PlayerList } from '@/components/room/PlayerList';
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
  const [kicking, setKicking] = useState<string | null>(null);
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
    
    setKicking(playerId);
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
      setKicking(null);
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
    if (!confirm(`Запустить игру с ${players.length} игроками?`)) return;
    
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
    } catch (err) {
      console.error(err);
      alert('Ошибка');
      setStartingGame(false);
    }
  }

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Комната: {code}</h1>
      
      <InviteLink code={code} />

      {isHost && settings && (
        <RoomSettings 
          settings={settings}
          onSettingsChange={setSettings}
          onSave={saveSettings}
        />
      )}

      <PlayerList
        players={players}
        currentPlayerId={currentPlayerId}
        onlinePlayers={onlinePlayers}
        isHost={isHost}
        onKick={kickPlayer}
        kicking={kicking}
      />

      {isHost && (
        <StartGameButton
          playerCount={players.length}
          onStart={startGame}
          starting={startingGame}
        />
      )}
    </div>
  );
}