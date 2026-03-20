// src/hooks/room/useRoomData.ts - ИСПРАВЛЕНО для avatar_id
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { normalizeRoomSettings } from '@/lib/normalizeRoomSettings';
import type { Player, Settings, SplashEventPayload, RoomStatus } from '@/types';

export function useRoomData(code: string) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    game_duration: 15,
    vote_duration: 1,
    spy_count: 1,
    mode_roles: false,
    mode_theme: false,
    mode_multi_spy: false,
    mode_spy_chaos: false,
    mode_hidden_threat: false,
  });
  const [splashEvent, setSplashEvent] = useState<SplashEventPayload | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);

  async function loadRoom() {
    try {
      console.log('📂 Loading room data from DB for code:', code);

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, code, status, settings, splash_event')
        .eq('code', code)
        .single();

      if (roomError || !room) {
        setError('Комната не найдена');
        setLoading(false);
        return;
      }

      setRoomId(room.id);
      setRoomStatus((room.status as RoomStatus) ?? null);
      setSplashEvent(room.splash_event ?? null);
      if (room.settings) {
        setSettings(normalizeRoomSettings(room.settings));
      }

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, nickname, avatar_id, is_host, room_id, joined_at')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      if (playersError) {
        console.error('Players load error:', playersError);
        setError('Ошибка загрузки игроков');
        setLoading(false);
        return;
      }

      setPlayers(playersData || []);
      
      const playerId = localStorage.getItem(`player_${code}`);
      
      if (playerId) {
        const currentPlayer = playersData?.find(p => p.id === playerId);
        
        if (!currentPlayer) {
          console.log('❌ Player not found in room');
          localStorage.removeItem(`player_${code}`);
          router.push(`/invite/${code}`);
          return;
        }
        
        if (currentPlayer.is_host) {
          setIsHost(true);
        }
      } else {
        console.log('❌ No playerId in localStorage');
        router.push(`/invite/${code}`);
        return;
      }
      
      console.log('✅ Room data loaded:', {
        roomId: room.id,
        players: playersData?.length,
        isHost
      });

      setLoading(false);

    } catch (err) {
      console.error('Error:', err);
      setError('Ошибка');
      setLoading(false);
    }
  }

  useEffect(() => {
    const playerId = localStorage.getItem(`player_${code}`);
    setCurrentPlayerId(playerId);
    loadRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return {
    players,
    setPlayers,
    roomId,
    loading,
    error,
    currentPlayerId,
    isHost,
    settings,
    setSettings,
    splashEvent,
    setSplashEvent,
    roomStatus,
    setRoomStatus,
  };
}