// src/hooks/room/useRoomData.ts - ИСПРАВЛЕНО для avatar_id
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Player } from '@/types/player';


type Settings = {
  game_duration: number;
  vote_duration: number;
  spy_count: number;
  mode_roles: boolean;
  mode_theme: boolean;
  mode_hidden_threat: boolean;
  mode_shadow_alliance: boolean;
  mode_spy_chaos: boolean;
};

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
    mode_hidden_threat: false,
    mode_shadow_alliance: false,
    mode_spy_chaos: false,
  });

  useEffect(() => {
    const playerId = localStorage.getItem(`player_${code}`);
    setCurrentPlayerId(playerId);
    loadRoom();
  }, [code]);

  async function loadRoom() {
    try {
      console.log('📂 Loading room data from DB for code:', code);

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, code, status, settings')
        .eq('code', code)
        .single();

      if (roomError || !room) {
        setError('Комната не найдена');
        setLoading(false);
        return;
      }

      setRoomId(room.id);
      
      if (room.settings) {
        setSettings(room.settings);
      }

      // КРИТИЧНО: явно указываем avatar_id!
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, nickname, avatar_id, is_host, room_id, joined_at') // ← ИСПРАВЛЕНО!
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
  };
}