// /hooks/room/useRoomData.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// Database-First подход: всегда загружаем из БД, не полагаемся на broadcast

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Player = {
  id: string;
  nickname: string;
  avatar: string;
  is_host: boolean;
  room_id: string;
  joined_at: string;
};

type Settings = {
  spy_count: number;
  game_duration: number;
  vote_duration: number;
  mode_roles: boolean;
  mode_theme: boolean;
  mode_spy_chaos: boolean;
  mode_hidden_threat: boolean;
  mode_shadow_alliance: boolean;
};

export function useRoomData(code: string) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // ЕДИНСТВЕННАЯ загрузка данных - из БД
  useEffect(() => {
    loadRoomData();
  }, [code]);

  async function loadRoomData() {
    try {
      console.log('📂 Loading room data from DB for code:', code);

      // 1. Получаем playerId из localStorage
      const playerId = localStorage.getItem(`player_${code}`);
      
      if (!playerId) {
        console.log('⚠️ No player ID found, redirecting to invite');
        router.push(`/invite/${code}`);
        return;
      }

      setCurrentPlayerId(playerId);

      // 2. Загружаем комнату
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status, settings')
        .eq('code', code)
        .single();

      if (roomError || !room) {
        console.error('Room not found:', roomError);
        setError('Комната не найдена');
        setLoading(false);
        return;
      }

      // Если игра уже началась - редирект
      if (room.status === 'playing') {
        console.log('🎮 Game already started, redirecting to game');
        router.push(`/game/${code}`);
        return;
      }

      setRoomId(room.id);
      setSettings(room.settings || {
        spy_count: 1,
        game_duration: 15,
        vote_duration: 1,
        mode_roles: false,
        mode_theme: false,
        mode_spy_chaos: false,
        mode_hidden_threat: false,
        mode_shadow_alliance: false,
      });

      // 3. Загружаем игроков
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, nickname, avatar, is_host, room_id, joined_at')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      if (playersError) {
        console.error('Players load error:', playersError);
        setError('Ошибка загрузки игроков');
        setLoading(false);
        return;
      }

      setPlayers(playersData || []);

      // 4. Проверяем что текущий игрок есть в комнате
      const currentPlayer = playersData?.find(p => p.id === playerId);
      
      if (!currentPlayer) {
        console.log('⚠️ Player not in room, redirecting to invite');
        localStorage.removeItem(`player_${code}`);
        router.push(`/invite/${code}`);
        return;
      }

      setIsHost(currentPlayer.is_host);

      console.log('✅ Room data loaded:', {
        roomId: room.id,
        players: playersData?.length,
        isHost: currentPlayer.is_host
      });

      setLoading(false);

    } catch (err) {
      console.error('Load room error:', err);
      setError('Ошибка загрузки');
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    roomId,
    players,
    setPlayers, // Для реалтайм обновлений
    settings,
    setSettings, // Для реалтайм обновлений
    currentPlayerId,
    isHost,
  };
}