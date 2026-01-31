import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

type UseGameRealtimeProps = {
  roomId: string | null;
  playerId: string | null;
  onOnlinePlayersChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEarlyVoteUpdate?: (data: { playerId: string; wantsVote: boolean; totalVotes: number; totalPlayers: number }) => void;
  onVotingStarted?: (endsAt: string) => void;
  onVoteCast?: (voterId: string) => void;
  onAllVotesCollected?: () => void;
  onVotingFinished?: (data: { result: any }) => void;
  onGameEnded?: (roomCode: string) => void;
  onGamePaused?: () => void;
  onGameResumed?: (endsAt: string) => void;
};

export function useGameRealtime({
  roomId,
  playerId,
  onOnlinePlayersChange,
  onEarlyVoteUpdate,
  onVotingStarted,
  onVoteCast,
  onAllVotesCollected,
  onVotingFinished,
  onGameEnded,
  onGamePaused,
  onGameResumed,
}: UseGameRealtimeProps) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId || !playerId) return;

    console.log('🎮 Setting up game realtime for room:', roomId);

    const channel = supabase
      .channel(`game-${roomId}`, {
        config: {
          presence: {
            key: playerId
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.keys(state).forEach(key => {
          online.add(key);
        });
        onOnlinePlayersChange(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        onOnlinePlayersChange((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        onOnlinePlayersChange((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .on('broadcast', { event: 'early_vote_updated' }, (payload) => {
        console.log('🗳️ Early vote updated:', payload);
        if (onEarlyVoteUpdate) {
          onEarlyVoteUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'voting_started' }, (payload) => {
        console.log('🎬 Voting started:', payload);
        if (onVotingStarted) {
          onVotingStarted(payload.payload.endsAt);
        }
      })
      .on('broadcast', { event: 'vote_cast' }, (payload) => {
        console.log('✅ Vote cast:', payload);
        if (onVoteCast) {
          onVoteCast(payload.payload.voterId);
        }
      })
      .on('broadcast', { event: 'all_votes_collected' }, (payload) => {
        console.log('🎯 All votes collected:', payload);
        if (onAllVotesCollected) {
          onAllVotesCollected();
        }
      })
      .on('broadcast', { event: 'voting_finished' }, (payload) => {
        console.log('🏁 Voting finished:', payload);
        if (onVotingFinished) {
          onVotingFinished(payload.payload);
        }
      })
      .on('broadcast', { event: 'game_ended' }, (payload) => {
        console.log('🏁 Game ended:', payload);
        if (onGameEnded) {
          onGameEnded(payload.payload.roomCode);
        }
      })
      .on('broadcast', { event: 'game_paused' }, () => {
        console.log('⏸️ Game paused');
        if (onGamePaused) {
          onGamePaused();
        }
      })
      .on('broadcast', { event: 'game_resumed' }, (payload) => {
        console.log('▶️ Game resumed:', payload);
        if (onGameResumed) {
          onGameResumed(payload.payload.endsAt);
        }
      })
      .subscribe(async (status) => {
        console.log('📡 Game realtime status:', status);
        if (status === 'SUBSCRIBED' && playerId) {
          await channel.track({
            player_id: playerId,
            in_game: true,
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
  }, [
    roomId, 
    playerId, 
    onOnlinePlayersChange, 
    onEarlyVoteUpdate, 
    onVotingStarted, 
    onVoteCast, 
    onAllVotesCollected, 
    onVotingFinished,
    onGameEnded,
    onGamePaused,
    onGameResumed
  ]);
}