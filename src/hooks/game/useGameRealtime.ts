// ИСПРАВЛЕННАЯ ВЕРСИЯ useGameRealtime.ts
// Исправлены: channel leaks, лишние переподписки

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ReactionPayload } from '@/contexts/ReactionsContext';

type UseGameRealtimeProps = {
  roomId: string | null;
  playerId: string | null;
  onOnlinePlayersChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  onEarlyVoteUpdate?: (data: { playerId: string; wantsVote: boolean; totalVotes: number; totalPlayers: number }) => void;
  onVotingStarted?: (endsAt: string) => void;
  onVoteCast?: (voterId: string) => void;
  onAllVotesCollected?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onVotingFinished?: (data: { result: any; phase?: string }) => void;
  onVotingClosed?: () => void;
  onVotingPhaseUpdated?: (payload: { phase: string }) => void;
  onGameEnded?: (payload: { roomCode?: string; shareHash?: string }) => void;
  onGamePaused?: () => void;
  onGameResumed?: (endsAt: string) => void;
  onSpyGuessStarted?: (payload: { autoWin: boolean; guessText: string; endsAt: string }) => void;
  onSpyGuessVote?: (payload: { yesCount: number; noCount: number }) => void;
  onSpyGuessFinished?: (payload: { accepted: boolean }) => void;
  onSpyGuessAutoWinAcked?: () => void;
  onSpyGuessAllVoted?: () => void;
  onReaction?: (payload: ReactionPayload) => void;
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
  onVotingClosed,
  onVotingPhaseUpdated,
  onGameEnded,
  onGamePaused,
  onGameResumed,
  onSpyGuessStarted,
  onSpyGuessVote,
  onSpyGuessFinished,
  onSpyGuessAutoWinAcked,
  onSpyGuessAllVoted,
  onReaction,
}: UseGameRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const callbacksRef = useRef({
    onOnlinePlayersChange,
    onEarlyVoteUpdate,
    onVotingStarted,
    onVoteCast,
    onAllVotesCollected,
    onVotingFinished,
    onVotingClosed,
    onVotingPhaseUpdated,
    onGameEnded,
    onGamePaused,
    onGameResumed,
    onSpyGuessStarted,
    onSpyGuessVote,
    onSpyGuessFinished,
    onSpyGuessAutoWinAcked,
    onSpyGuessAllVoted,
    onReaction,
  });

  useEffect(() => {
    callbacksRef.current = {
      onOnlinePlayersChange,
      onEarlyVoteUpdate,
      onVotingStarted,
      onVoteCast,
      onAllVotesCollected,
      onVotingFinished,
      onVotingClosed,
      onVotingPhaseUpdated,
      onGameEnded,
      onGamePaused,
      onGameResumed,
      onSpyGuessStarted,
      onSpyGuessVote,
      onSpyGuessFinished,
      onSpyGuessAutoWinAcked,
      onSpyGuessAllVoted,
      onReaction,
    };
  });

  useEffect(() => {
    if (!roomId || !playerId) {
      console.log('⏸️ No roomId or playerId, skipping realtime setup');
      return;
    }

    // ИСПРАВЛЕНО: Проверяем что channel еще не создан
    if (channelRef.current) {
      console.log('⚠️ Channel already exists for room:', roomId, '- skipping creation');
      return;
    }

    console.log('🎮 Setting up game realtime for room:', roomId);

    const channel = supabase
      .channel(`room-${roomId}`, {
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
        callbacksRef.current.onOnlinePlayersChange(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        callbacksRef.current.onOnlinePlayersChange((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        callbacksRef.current.onOnlinePlayersChange((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .on('broadcast', { event: 'early_vote_updated' }, (payload) => {
        console.log('🗳️ Early vote updated:', payload);
        if (callbacksRef.current.onEarlyVoteUpdate) {
          callbacksRef.current.onEarlyVoteUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'voting_started' }, (payload) => {
        console.log('🎬 Voting started:', payload);
        if (callbacksRef.current.onVotingStarted) {
          callbacksRef.current.onVotingStarted(payload.payload.endsAt);
        }
      })
      .on('broadcast', { event: 'vote_cast' }, (payload) => {
        console.log('✅ Vote cast:', payload);
        if (callbacksRef.current.onVoteCast) {
          callbacksRef.current.onVoteCast(payload.payload.voterId);
        }
      })
      .on('broadcast', { event: 'all_votes_collected' }, (payload) => {
        console.log('🎯 All votes collected:', payload);
        if (callbacksRef.current.onAllVotesCollected) {
          callbacksRef.current.onAllVotesCollected();
        }
      })
      .on('broadcast', { event: 'voting_finished' }, (payload) => {
        console.log('🏁 Voting finished:', payload);
        if (callbacksRef.current.onVotingFinished) {
          callbacksRef.current.onVotingFinished(payload.payload);
        }
      })
      .on('broadcast', { event: 'voting_closed' }, () => {
        console.log('🚪 Voting closed');
        if (callbacksRef.current.onVotingClosed) {
          callbacksRef.current.onVotingClosed();
        }
      })
      .on('broadcast', { event: 'voting_phase_updated' }, (payload) => {
        console.log('🔄 Voting phase updated:', payload);
        if (callbacksRef.current.onVotingPhaseUpdated) {
          callbacksRef.current.onVotingPhaseUpdated(payload.payload);
        }
      })
      .on('broadcast', { event: 'game_ended' }, (payload) => {
        console.log('🏁 Game ended:', payload);
        if (callbacksRef.current.onGameEnded) {
          callbacksRef.current.onGameEnded(payload.payload);
        }
      })
      .on('broadcast', { event: 'game_paused' }, () => {
        console.log('⏸️ Game paused');
        if (callbacksRef.current.onGamePaused) {
          callbacksRef.current.onGamePaused();
        }
      })
      .on('broadcast', { event: 'game_resumed' }, (payload) => {
        console.log('▶️ Game resumed:', payload);
        if (callbacksRef.current.onGameResumed) {
          callbacksRef.current.onGameResumed(payload.payload.endsAt);
        }
      })
      .on('broadcast', { event: 'spy_guess_started' }, (payload) => {
        console.log('🕵️ Spy guess started:', payload);
        if (callbacksRef.current.onSpyGuessStarted) {
          const p = payload.payload;
          callbacksRef.current.onSpyGuessStarted({
            autoWin: p.autoWin,
            guessText: p.guessText ?? '',
            endsAt: p.endsAt ?? '',
          });
        }
      })
      .on('broadcast', { event: 'spy_guess_vote' }, (payload) => {
        const p = payload.payload;
        if (callbacksRef.current.onSpyGuessVote && p != null && typeof p.yesCount === 'number' && typeof p.noCount === 'number') {
          callbacksRef.current.onSpyGuessVote({ yesCount: p.yesCount, noCount: p.noCount });
        }
      })
      .on('broadcast', { event: 'spy_guess_finished' }, (payload) => {
        console.log('🕵️ Spy guess finished:', payload);
        if (callbacksRef.current.onSpyGuessFinished) {
          callbacksRef.current.onSpyGuessFinished({ accepted: payload.payload?.accepted === true });
        }
      })
      .on('broadcast', { event: 'spy_guess_auto_win_acked' }, () => {
        console.log('🕵️ Spy guess auto-win acked');
        if (callbacksRef.current.onSpyGuessAutoWinAcked) {
          callbacksRef.current.onSpyGuessAutoWinAcked();
        }
      })
      .on('broadcast', { event: 'spy_guess_all_voted' }, () => {
        console.log('🕵️ Spy guess: all civilians voted');
        if (callbacksRef.current.onSpyGuessAllVoted) {
          callbacksRef.current.onSpyGuessAllVoted();
        }
      })
      .on('broadcast', { event: 'reaction' }, (payload) => {
        const p = payload.payload as ReactionPayload;
        if (p?.playerId != null && p?.reactionId != null && callbacksRef.current.onReaction) {
          callbacksRef.current.onReaction(p);
        }
      })
      .subscribe(async (status) => {
        console.log('📡 Game realtime status:', status);
        
        // ИСПРАВЛЕНО: Только трекаем если статус SUBSCRIBED
        if (status === 'SUBSCRIBED' && playerId) {
          try {
            await channel.track({
              player_id: playerId,
              in_game: true,
              online_at: new Date().toISOString()
            });
            console.log('✅ Presence tracked successfully');
          } catch (err) {
            console.error('❌ Failed to track presence:', err);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up game realtime channel');
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          console.log('✅ Channel removed successfully');
        } catch (err) {
          console.error('❌ Failed to remove channel:', err);
        }
        channelRef.current = null;
      }
    };
  }, [roomId, playerId]); // ВАЖНО: Только roomId и playerId в deps!
  
  const sendReaction = useCallback(
    (reactionId: number) => {
      const ch = channelRef.current;
      if (!ch || !playerId) return;
      ch.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { playerId, reactionId },
      });
    },
    [playerId]
  );
  
  // НЕ добавляем callbacks в dependencies - они в refs
  return { sendReaction };
}