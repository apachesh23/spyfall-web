// src/hooks/game/useGameData.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStartedAt, setGameStartedAt] = useState<string | null>(null);
  const [gameSplashEvent, setGameSplashEvent] = useState<{ type: string; at: string; ends_at?: string; countdownSeconds?: number; countdownLabel?: string; eliminatedId?: string; wasSpy?: boolean; winner?: string; voteCounts?: Record<string, number> } | null>(null);
  const [gamePhase, setGamePhase] = useState<string | null>(null);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number | null>(null);
  const [votingStatus, setVotingStatus] = useState<string>('none');
  const [votingEndsAt, setVotingEndsAt] = useState<string | null>(null);
  const [votingPhase, setVotingPhase] = useState<string | null>(null);
  const [votingType, setVotingType] = useState<string>('early');
  const [votingResultEndsAt, setVotingResultEndsAt] = useState<string | null>(null);
  const [revoteCandidates, setRevoteCandidates] = useState<string[]>([]);
  const [spyGuessText, setSpyGuessText] = useState<string | null>(null);
  const [spyGuessStatus, setSpyGuessStatus] = useState<string | null>(null);
  const [spyGuessEndsAt, setSpyGuessEndsAt] = useState<string | null>(null);
  const [earlyVoteUsedCount, setEarlyVoteUsedCount] = useState<number>(0);
  const [earlyVoteAvailableAt, setEarlyVoteAvailableAt] = useState<string | null>(null);
  const [votedPlayerIdsFromServer, setVotedPlayerIdsFromServer] = useState<string[]>([]);
  const [myVoteFromServer, setMyVoteFromServer] = useState<string | null>(null);
  const [mySkippedFromServer, setMySkippedFromServer] = useState(false);
  const redirectToRoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status, settings, current_game_id')
        .eq('code', code)
        .single();

      if (roomError || !room || !room.current_game_id || room.status === 'waiting') {
        if (redirectToRoomTimeoutRef.current) clearTimeout(redirectToRoomTimeoutRef.current);
        redirectToRoomTimeoutRef.current = setTimeout(() => {
          redirectToRoomTimeoutRef.current = null;
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/game/')) {
            router.replace(`/room/${code}`);
          }
        }, 2500);
        return;
      }

      if (redirectToRoomTimeoutRef.current) {
        clearTimeout(redirectToRoomTimeoutRef.current);
        redirectToRoomTimeoutRef.current = null;
      }
      setRoomId(room.id);
      setGameId(room.current_game_id);

      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('location_id, selected_theme, spy_ids, started_at, ends_at, splash_event, phase, paused_at, remaining_time_ms, voting_status, voting_ends_at, voting_phase, voting_result_ends_at, voting_round, revote_candidates, voting_type, spy_guess_text, spy_guess_status, spy_guess_started_at, spy_guess_ends_at, spy_action_type, kill_unlock_at, early_vote_used_count, early_vote_available_at')
        .eq('id', room.current_game_id)
        .single();

      if (gameError || !game) {
        console.error('Game load error:', gameError);
        router.push(`/room/${code}`);
        return;
      }

      setGameStartedAt(game.started_at);
      setGameSplashEvent(game.splash_event ?? null);
      setGamePhase((game as { phase?: string }).phase ?? null);
      setIsGamePaused(!!game.paused_at);
      setRemainingTimeMs(game.remaining_time_ms ?? null);
      setVotingStatus(game.voting_status ?? 'none');
      setVotingEndsAt(game.voting_ends_at ?? null);
      setVotingPhase(game.voting_phase ?? null);
      setVotingType((game.voting_type as string) ?? 'early');
      setVotingResultEndsAt(game.voting_result_ends_at ?? null);
      setRevoteCandidates(Array.isArray(game.revote_candidates) ? game.revote_candidates : []);
      setSpyGuessText(game.spy_guess_text ?? null);
      setSpyGuessStatus(game.spy_guess_status ?? null);
      setSpyGuessEndsAt(game.spy_guess_ends_at ?? null);
      setEarlyVoteUsedCount(typeof game.early_vote_used_count === 'number' ? game.early_vote_used_count : 0);
      setEarlyVoteAvailableAt(game.early_vote_available_at ?? null);

      if (game.voting_status === 'active') {
        const { data: votes } = await supabase
          .from('votes')
          .select('voter_id, suspect_id')
          .eq('room_id', room.id);
        const ids = votes?.map((v) => v.voter_id) ?? [];
        setVotedPlayerIdsFromServer(ids);
        const myRow = votes?.find((v) => v.voter_id === playerId);
        if (myRow) {
          setMySkippedFromServer(myRow.suspect_id === myRow.voter_id);
          setMyVoteFromServer(myRow.suspect_id === myRow.voter_id ? null : myRow.suspect_id);
        } else {
          setMyVoteFromServer(null);
          setMySkippedFromServer(false);
        }
      } else {
        setVotedPlayerIdsFromServer([]);
        setMyVoteFromServer(null);
        setMySkippedFromServer(false);
      }

      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, nickname, avatar_id, is_spy, role, is_alive, is_host, wants_early_vote, death_reason')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

      setPlayers((allPlayers || []) as GamePlayer[]);

      const currentPlayer = allPlayers?.find((p) => p.id === playerId);
      if (!currentPlayer) {
        router.push(`/invite/${code}`);
        return;
      }

      setIsHost(currentPlayer.is_host || false);

      const { data: location } = await supabase
        .from('locations')
        .select('name, image_key')
        .eq('id', game.location_id)
        .single();

      setGameData({
        locationName: location?.name || 'Неизвестно',
        imageKey: location?.image_key || null,
        theme: game.selected_theme ?? null,
        myRole: currentPlayer.role,
        isSpy: currentPlayer.is_spy,
        isAlive: currentPlayer.is_alive,
        settings: room.settings ?? {},
        endsAt: game.ends_at,
        spyIds: game.spy_ids || [],
        spyActionType: (game.spy_action_type as 'guess' | 'kill' | null) ?? null,
        killUnlockAt: game.kill_unlock_at ?? null,
      });

      setLoading(false);
    } catch (err) {
      console.error('Load game error:', err);
      router.push(`/room/${code}`);
    }
  }

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
        },
        () => {
          console.log('Game updated - Reloading...');
          loadGame();
        }
      )
      .subscribe();

    return () => {
      if (redirectToRoomTimeoutRef.current) {
        clearTimeout(redirectToRoomTimeoutRef.current);
        redirectToRoomTimeoutRef.current = null;
      }
      supabase.removeChannel(subscription);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const myPlayer = players.find(p => p.id === currentPlayerId);

  return {
    loading,
    gameData,
    players,
    setPlayers,
    currentPlayerId,
    isHost,
    roomId,
    gameId,
    gameStartedAt,
    gameSplashEvent,
    gamePhase,
    isGamePaused,
    remainingTimeMs,
    myWantsEarlyVote: myPlayer?.wants_early_vote || false,
    gameSessionKey: gameStartedAt || 'no-game',
    votingStatus,
    votingEndsAt,
    votingPhase,
    votingType,
    votingResultEndsAt,
    revoteCandidates,
    spyGuessText,
    spyGuessStatus,
    spyGuessEndsAt,
    earlyVoteUsedCount,
    earlyVoteAvailableAt,
    votedPlayerIdsFromServer,
    myVoteFromServer,
    mySkippedFromServer,
    cancelRedirectToRoom: () => {
      if (redirectToRoomTimeoutRef.current) {
        clearTimeout(redirectToRoomTimeoutRef.current);
        redirectToRoomTimeoutRef.current = null;
      }
    },
  };
}