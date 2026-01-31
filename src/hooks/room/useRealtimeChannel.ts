import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Player = {
  id: string;
  nickname: string;
  avatar: string;
  is_host: boolean;
  room_id: string;
};

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

    const channel = supabase
      .channel(`room-${roomId}`, {
        config: {
          presence: {
            key: playerId
          }
        }
      })
      .on('broadcast', { event: 'player_joined' }, (payload) => {
        console.log('🎉 Player joined!', payload);
        setPlayers((prev) => {
          if (prev.some(p => p.id === payload.payload.id)) return prev;
          return [...prev, payload.payload];
        });
      })
      .on('broadcast', { event: 'player_kicked' }, (payload) => {
        console.log('👢 Player kicked:', payload);
        
        const kickedId = payload.payload.playerId;
        const myPlayerId = localStorage.getItem(`player_${code}`);
        
        if (kickedId === myPlayerId) {
          alert('Вас кикнул ведущий');
          localStorage.removeItem(`player_${code}`);
          router.push(`/invite/${code}`);
          return;
        }
        
        setPlayers((prev) => prev.filter(p => p.id !== kickedId));
      })
      .on('broadcast', { event: 'settings_updated' }, (payload) => {
        console.log('⚙️ Settings updated:', payload);
        setSettings(payload.payload);
      })
      .on('broadcast', { event: 'game_started' }, (payload) => {
        console.log('🎮 Game started!', payload);
        router.push(`/game/${code}`);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.keys(state).forEach(key => {
          online.add(key);
        });
        setOnlinePlayers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlinePlayers((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlinePlayers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        console.log('📡 Status:', status);
        if (status === 'SUBSCRIBED' && playerId) {
          await channel.track({
            player_id: playerId,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, playerId, code, setPlayers, setSettings, setOnlinePlayers, router]);
}