// src/hooks/game/useGameData.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { GamePlayer, GameData } from '@/types';

export function useGameData(code: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStartedAt, setGameStartedAt] = useState<string | null>(null);

  useEffect(() => {
    loadGame();

    const subscription = supabase
      .channel(`game-${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
        },
        () => {
          console.log('Player updated - Reloading...');
          loadGame();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          console.log('Room updated - Reloading...');
          loadGame();
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
        .select('id, status, location_id, selected_theme, spy_ids, settings, game_ends_at, game_started_at')
        .eq('code', code)
        .single();

      if (!room || room.status !== 'playing') {
        router.push(`/room/${code}`);
        return;
      }

      setRoomId(room.id);
      setGameStartedAt(room.game_started_at);

      // ИСПРАВЛЕНО: avatar_id вместо avatar
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, nickname, avatar_id, is_spy, role, is_alive, is_host, wants_early_vote')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      setPlayers((allPlayers || []) as GamePlayer[]);

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
    setPlayers,
    currentPlayerId,
    isHost,
    roomId,
    myWantsEarlyVote: myPlayer?.wants_early_vote || false,
    gameSessionKey: gameStartedAt || 'no-game',
  };
}