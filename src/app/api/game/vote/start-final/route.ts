// Запуск финального голосования по таймеру (время игры вышло)

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

function computeGameTimeSec(startedAt: string | null, durationMin?: number | null) {
  if (!startedAt || !durationMin || durationMin <= 0) return null;
  const total = durationMin * 60;
  let elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (elapsed < 0) elapsed = 0;
  if (elapsed > total) elapsed = total;
  return elapsed;
}

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, current_game_id, status, settings')
      .eq('id', roomId)
      .single();

    if (roomError || !room || !room.current_game_id || room.status !== 'playing') {
      return NextResponse.json({ error: 'Room or game not found' }, { status: 404 });
    }

    const gameId = room.current_game_id;
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, voting_status, started_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.voting_status === 'active') {
      return NextResponse.json({ success: true, alreadyActive: true });
    }

    const voteDuration = room.settings?.vote_duration ?? 1;
    const votingEndsAt = new Date(Date.now() + voteDuration * 60 * 1000);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('games')
      .update({
        phase: 'voting',
        voting_status: 'active',
        voting_phase: 'collecting',
        voting_type: 'final',
        voting_started_at: nowIso,
        voting_ends_at: votingEndsAt.toISOString(),
        voting_result_ends_at: null,
        voting_round: 1,
        revote_candidates: null,
        paused_at: nowIso,
        remaining_time_ms: 0,
        splash_event: null,
        updated_at: nowIso,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Start final voting error:', updateError);
      return NextResponse.json({ error: 'Failed to start final voting' }, { status: 500 });
    }

    // Логируем старт финального голосования с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'voting_started_final',
          payload: {
            room_id: roomId,
            voting_type: 'final',
            ends_at: votingEndsAt.toISOString(),
            game_time_sec: gameTimeSec,
          },
        });
    }

    await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'voting_started',
      payload: { endsAt: votingEndsAt.toISOString() },
    });
    await supabase.removeChannel(channel);

    console.log('✅ Final voting started for room:', roomId);
    return NextResponse.json({ success: true, endsAt: votingEndsAt.toISOString() });
  } catch (error) {
    console.error('Start final voting error:', error);
    return NextResponse.json({ error: 'Failed to start final voting' }, { status: 500 });
  }
}
