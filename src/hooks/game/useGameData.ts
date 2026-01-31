import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Player = {
  id: string;
  nickname: string;
  avatar: string;
  is_spy: boolean;
  role: string | null;
  is_alive: boolean;
  is_host?: boolean;
  wants_early_vote?: boolean; // ← ДОБАВИЛИ
};

type GameData = {
  locationName: string;
  theme: string;
  myRole: string | null;
  isSpy: boolean;
  isAlive: boolean;
  settings: any;
  endsAt: string;
  spyIds: string[];
};

export function useGameData(code: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStartedAt, setGameStartedAt] = useState<string | null>(null); // ← ДОБАВИЛИ

  useEffect(() => {
    loadGame();
    
    // Подписываемся на изменения статуса комнаты
    const subscription = supabase
      .channel(`room-status-${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${code}`
        },
        (payload) => {
          console.log('🔄 Room updated:', payload);
          // Если статус изменился на playing - перезагружаем
          if (payload.new.status === 'playing') {
            console.log('🎮 New game detected! Reloading...');
            loadGame();
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [code]);

  async function loadGame() {
    console.log('🔄 Loading game data for code:', code);
    try {
      const playerId = localStorage.getItem(`player_${code}`);
      console.log('Player ID from localStorage:', playerId);
      if (!playerId) {
        router.push(`/invite/${code}`);
        return;
      }
      setCurrentPlayerId(playerId);

      const { data: room } = await supabase
        .from('rooms')
        .select('id, status, location_id, selected_theme, spy_ids, settings, game_ends_at, game_started_at') // ← ДОБАВИЛИ game_started_at
        .eq('code', code)
        .single();

      if (!room || room.status !== 'playing') {
        router.push(`/room/${code}`);
        return;
      }

      setRoomId(room.id);
      setGameStartedAt(room.game_started_at); // ← СОХРАНЯЕМ

      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, nickname, avatar, is_spy, role, is_alive, is_host, wants_early_vote')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      setPlayers(allPlayers || []);

      const currentPlayer = allPlayers?.find(p => p.id === playerId);
      if (!currentPlayer) {
        router.push(`/invite/${code}`);
        return;
      }

      setIsHost(currentPlayer.is_host || false);

      const { data: location } = await supabase
        .from('locations')
        .select('name')
        .eq('id', room.location_id)
        .single();

      setGameData({
        locationName: location?.name || 'Неизвестно',
        theme: room.selected_theme,
        myRole: currentPlayer.role,
        isSpy: currentPlayer.is_spy,
        isAlive: currentPlayer.is_alive,
        settings: room.settings,
        endsAt: room.game_ends_at,
        spyIds: room.spy_ids || [],
      });

      setLoading(false);

    } catch (err) {
      console.error('Load game error:', err);
      router.push(`/room/${code}`);
    }
  }

  const myPlayer = players.find(p => p.id === currentPlayerId);

  return {
    loading,
    gameData,
    players,
    currentPlayerId,
    isHost,
    roomId,
    setPlayers,
    myWantsEarlyVote: myPlayer?.wants_early_vote || false,
    gameSessionKey: gameStartedAt || 'no-game', // ← ИСПОЛЬЗУЕМ STATE
  };
}