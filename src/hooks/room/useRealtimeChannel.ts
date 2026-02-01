// src/hooks/room/useRealtimeChannel.ts - ИСПРАВЛЕНО для avatar_id
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Player } from '@/types/player';
import { isValidAvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';

type UseRealtimeProps = {
  roomId: string | null;
  code: string;
  playerId: string | null;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  setOnlinePlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useRealtimeChannel({
  roomId,
  code,
  playerId,
  setPlayers,
  setSettings,
  setOnlinePlayers,
}: UseRealtimeProps) {
  const router = useRouter();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId || !playerId) return;

    console.log('🔌 Subscribing to realtime for room:', roomId);

    const channel = supabase.channel(`room-${roomId}`, {
      config: {
        presence: {
          key: playerId
        }
      }
    });

    // ============================================
    // POSTGRES_CHANGES - Источник истины для STATE
    // ============================================

    // 1. PLAYERS - INSERT (новый игрок присоединился)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('➕ Player joined:', payload.new);
        
        const raw = payload.new as any;

        const newPlayer: Player = {
          ...raw,
          // если avatar_id не входит в AvatarId — ставим дефолт
          avatar_id: isValidAvatarId(raw.avatar_id) ? raw.avatar_id : DEFAULT_AVATAR_ID,
          // если joined_at вдруг отсутствует — подстрахуемся
          joined_at: raw.joined_at ?? new Date().toISOString(),
        };
        
        setPlayers((prev) => {
          // Проверяем дубликат
          if (prev.some(p => p.id === newPlayer.id)) {
            return prev;
          }
          
          // Добавляем и сортируем по joined_at
          const updated = [...prev, newPlayer];
          return updated.sort((a, b) => 
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
          );
        });
      }
    );

    // 2. PLAYERS - DELETE (игрок кикнут или вышел)
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('➖ Player left:', payload.old);
        
        const deletedId = payload.old.id;
        
        // Если удалили меня - редирект
        if (deletedId === playerId) {
          console.log('🚪 You were kicked, redirecting...');
          localStorage.removeItem(`player_${code}`);
          router.push(`/invite/${code}`);
          return;
        }
        
        // Убираем игрока из списка
        setPlayers((prev) => prev.filter(p => p.id !== deletedId));
      }
    );

    // 3. ROOMS - UPDATE (настройки или статус изменились)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        console.log('🔄 Room updated');
        
        const newRoom = payload.new;
        const oldRoom = payload.old;

        // Обновились настройки
        if (JSON.stringify(newRoom.settings) !== JSON.stringify(oldRoom.settings)) {
          console.log('⚙️ Settings changed');
          setSettings(newRoom.settings);
        }

        // Игра началась!
        if (newRoom.status === 'playing' && oldRoom.status !== 'playing') {
          console.log('🎮 Game started, redirecting to game');
          router.push(`/game/${code}`);
        }
      }
    );

    // ============================================
    // PRESENCE - Только для online статуса (не критично)
    // ============================================

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = new Set<string>();
      Object.keys(state).forEach(key => {
        online.add(key);
      });
      setOnlinePlayers(online);
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      setOnlinePlayers((prev) => new Set([...prev, key]));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setOnlinePlayers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    });

    // ============================================
    // SUBSCRIBE
    // ============================================

    channel.subscribe(async (status) => {
      console.log('📡 Realtime status:', status);
      
      if (status === 'SUBSCRIBED' && playerId) {
        await channel.track({
          player_id: playerId,
          online_at: new Date().toISOString()
        });
      }
    });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Unsubscribing from realtime');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, playerId, code, setPlayers, setSettings, setOnlinePlayers, router]);
}