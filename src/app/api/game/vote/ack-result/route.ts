// /api/game/vote/ack-result — завершение экрана результата (5с), снятие глобальной фазы голосования

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// TODO DEBUG: 10 сек для теста; вернуть 3 * 60 * 1000 для продакшена
const EARLY_VOTE_COOLDOWN_MS = 10 * 1000;

async function resumeGameFromGameRow(gameId: string, channel: RealtimeChannel) {
  const { data: game } = await supabase
    .from('games')
    .select('remaining_time_ms, voting_type, early_vote_used_count')
    .eq('id', gameId)
    .single();

  if (!game?.remaining_time_ms) return;

  const now = Date.now();
  const newEndsAt = new Date(now + game.remaining_time_ms);
  const nowIso = new Date().toISOString();

  const isEarlyVoting = (game.voting_type as string) === 'early';
  const usedCount = typeof game.early_vote_used_count === 'number' ? game.early_vote_used_count : 0;
  const startCooldownFromResume =
    isEarlyVoting && usedCount === 1;

  const updatePayload: Record<string, unknown> = {
    ends_at: newEndsAt.toISOString(),
    paused_at: null,
    remaining_time_ms: null,
    updated_at: nowIso,
  };
  if (startCooldownFromResume) {
    updatePayload.early_vote_available_at = new Date(now + EARLY_VOTE_COOLDOWN_MS).toISOString();
  }

  await supabase.from('games').update(updatePayload).eq('id', gameId);

  await channel.send({
    type: 'broadcast',
    event: 'game_resumed',
    payload: { endsAt: newEndsAt.toISOString() },
  });
}

export async function POST(request: Request) {
  let channel: RealtimeChannel | null = null;

  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, current_game_id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room || !room.current_game_id) {
      return NextResponse.json({ error: 'Room or game not found' }, { status: 404 });
    }

    const gameId = room.current_game_id;
    const nowIso = new Date().toISOString();

    const updateAndClaim = (phase: string, updates: Record<string, unknown>) =>
      supabase.from('games').update({ ...updates, updated_at: nowIso }).eq('id', gameId).eq('voting_phase', phase).select('remaining_time_ms').maybeSingle();

    let claimed: { remaining_time_ms: number | null } | null = null;
    let closedPhase: 'no_vote' | 'winner' | 'tie' | null = null;

    const { data: noVoteRow } = await updateAndClaim('result_no_vote', {
      voting_status: 'none',
      voting_phase: null,
      voting_result_ends_at: null,
      voting_round: 1,
      revote_candidates: null,
      splash_event: null,
    });
    if (noVoteRow) {
      claimed = noVoteRow;
      closedPhase = 'no_vote';
    }

    if (!claimed) {
      const { data: revoteNoVoteRow } = await updateAndClaim('revote_result_no_vote', {
        voting_status: 'none',
        voting_phase: null,
        voting_result_ends_at: null,
        voting_round: 1,
        revote_candidates: null,
        splash_event: null,
      });
      if (revoteNoVoteRow) {
        claimed = revoteNoVoteRow;
        closedPhase = 'no_vote';
      }
    }

    if (!claimed) {
      const newStatus = room.status === 'finished' ? 'finished' : 'none';
      const winnerUpdates: Record<string, unknown> = {
        voting_status: newStatus,
        voting_phase: null,
        voting_result_ends_at: null,
        voting_round: 1,
        revote_candidates: null,
      };
      if (room.status !== 'finished') {
        winnerUpdates.splash_event = null;
      } else {
        // Победа мирных: после закрытия сплэша изгнания переводим splash в победный экран.
        const { data: gameRow } = await supabase.from('games').select('splash_event').eq('id', gameId).single();
        const ev = gameRow?.splash_event as { type?: string; wasSpy?: boolean; at?: string; eliminatedId?: string; voteCounts?: Record<string, number> } | null;
        if (ev?.type === 'voting_kicked_civilian' && ev?.wasSpy) {
          winnerUpdates.splash_event = {
            type: 'game_over_civilians_win',
            at: ev.at ?? nowIso,
            ends_at: new Date(Date.now() + 5 * 1000).toISOString(),
            winner: 'civilians',
            eliminatedId: ev.eliminatedId,
            wasSpy: true,
            voteCounts: ev.voteCounts ?? {},
          };
        }
      }
      const { data: winnerRow } = await updateAndClaim('result_winner', winnerUpdates);
      if (winnerRow) {
        claimed = winnerRow;
        closedPhase = 'winner';
      }
    }

    if (!claimed) {
      const revoteWinnerUpdates: Record<string, unknown> = {
        voting_status: room.status === 'finished' ? 'finished' : 'none',
        voting_phase: null,
        voting_result_ends_at: null,
        voting_round: 1,
        revote_candidates: null,
        updated_at: nowIso,
      };
      if (room.status !== 'finished') revoteWinnerUpdates.splash_event = null;
      const { data: revoteWinnerRow } = await supabase
        .from('games')
        .update(revoteWinnerUpdates)
        .eq('id', gameId)
        .eq('voting_phase', 'revote_result_winner')
        .select('remaining_time_ms')
        .maybeSingle();
      if (revoteWinnerRow) {
        claimed = revoteWinnerRow;
        closedPhase = 'winner';
      }
    }

    if (!claimed) {
      const { data: tieRow } = await supabase
        .from('games')
        .update({ voting_phase: 'revote', voting_result_ends_at: null, updated_at: nowIso })
        .eq('id', gameId)
        .eq('voting_phase', 'result_tie')
        .select('id')
        .maybeSingle();
      if (tieRow) {
        claimed = tieRow as unknown as { remaining_time_ms: number | null };
        closedPhase = 'tie';
      }
    }

    if (!claimed) {
      return NextResponse.json({ success: true, closed: false });
    }

    channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Channel timeout')), 8000);
      channel!.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    if (closedPhase === 'no_vote' || closedPhase === 'winner') {
      await channel.send({ type: 'broadcast', event: 'voting_closed', payload: {} });
      if (closedPhase === 'no_vote' || room.status !== 'finished') {
        await resumeGameFromGameRow(gameId, channel);
      }
    } else if (closedPhase === 'tie') {
      await channel.send({ type: 'broadcast', event: 'voting_phase_updated', payload: { phase: 'revote' } });
    }

    await supabase.removeChannel(channel);
    return NextResponse.json({ success: true, closed: true });
  } catch (err) {
    console.error('Ack result error:', err);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (e) {
        console.error('Channel cleanup:', e);
      }
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
