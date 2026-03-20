// src/hooks/room/useRealtimeChannel.ts - ИСПРАВЛЕНО для avatar_id
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeRoomSettings } from '@/lib/normalizeRoomSettings';
import { useRouteLoaderStore } from '@/store/route-loader-store';
import type { Player, Settings, SplashEventPayload, RoomStatus } from '@/types';
import { isValidAvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';

export type ReactionPayload = { playerId: string; reactionId: number };

type UseRealtimeProps = {
  roomId: string | null;
  code: string;
  playerId: string | null;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setOnlinePlayers: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Обновление статуса комнаты (waiting/playing/finished) */
  setRoomStatus?: React.Dispatch<React.SetStateAction<RoomStatus | null>>;
  /** Обновление текущего баннера при изменении rooms.splash_event */
  setSplashEvent?: React.Dispatch<React.SetStateAction<SplashEventPayload | null>>;
  /** Вызывается при получении broadcast "reaction" от любого игрока в комнате */
  onReaction?: (payload: ReactionPayload) => void;
};

export function useRealtimeChannel({
  roomId,
  code,
  playerId,
  setPlayers,
  setSettings,
  setOnlinePlayers,
  setRoomStatus,
  setSplashEvent,
  onReaction,
}: UseRealtimeProps) {
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onReactionRef = useRef(onReaction);
  useEffect(() => { onReactionRef.current = onReaction; });

  useEffect(() => {
    if (!roomId || !playerId) return;

    channelRef.current = null;
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
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        if (newRoom.status !== oldRoom.status) {
          setRoomStatus?.((newRoom.status as RoomStatus) ?? null);
        }

        // Обновились настройки (нормализуем, чтобы не терять max_players и форму)
        if (JSON.stringify(newRoom.settings) !== JSON.stringify(oldRoom.settings)) {
          console.log('⚙️ Settings changed');
          setSettings(normalizeRoomSettings(newRoom.settings));
        }

        // Баннер: показ/снятие
        if (newRoom.splash_event !== oldRoom.splash_event) {
          setSplashEvent?.(newRoom.splash_event ?? null);
        }

        // Игра началась!
        if (newRoom.status === 'playing' && oldRoom.status !== 'playing') {
          const hasStartSplash = newRoom.splash_event?.type === 'system_start';
          if (!hasStartSplash) {
            console.log('🎮 Game started, redirecting to game');
            // Включаем глобальный лоадер ДО редиректа, чтобы скрыть перестройку UI
            useRouteLoaderStore.getState().start();
            router.push(`/game/${code}`);
          }
        }

        // system_start завершён и снят: теперь безопасно переходить в игру.
        if (
          newRoom.status === 'playing' &&
          oldRoom.splash_event?.type === 'system_start' &&
          !newRoom.splash_event
        ) {
          console.log('🎮 Start splash finished, redirecting to game');
          useRouteLoaderStore.getState().start();
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
    // BROADCAST — реакции (как в Google Meet), без записи в БД
    // ============================================
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const p = payload as ReactionPayload;
      if (p?.playerId != null && p?.reactionId != null) {
        onReactionRef.current?.(p);
      }
    });

    // ============================================
    // SUBSCRIBE
    // ============================================

    channel.subscribe(async (status) => {
      console.log('📡 Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        if (playerId) {
          await channel.track({
            player_id: playerId,
            online_at: new Date().toISOString()
          });
        }
      }
    });

    return () => {
      console.log('🔌 Unsubscribing from realtime');
      channelRef.current = null;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, playerId, code, setPlayers, setSettings, setOnlinePlayers, setRoomStatus, setSplashEvent, router]);

  const sendReaction = useCallback((reactionId: number) => {
    const ch = channelRef.current;
    if (!ch || !playerId) return;
    ch.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { playerId, reactionId },
    });
  }, [playerId]);

  return { sendReaction };
}