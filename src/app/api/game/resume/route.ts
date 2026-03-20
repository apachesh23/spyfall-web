import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing roomId or hostId' }, { status: 400 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id, current_game_id')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id || room.host_id !== hostId) {
      return NextResponse.json({ error: 'Room not found or only host can resume' }, { status: 403 });
    }

    const { data: game } = await supabase
      .from('games')
      .select('remaining_time_ms, paused_at, kill_unlock_at, early_vote_available_at')
      .eq('id', room.current_game_id)
      .single();

    if (game?.remaining_time_ms == null) {
      return NextResponse.json({ error: 'Game not paused or not found' }, { status: 400 });
    }

    const now = new Date();
    const newEndsAt = new Date(now.getTime() + (game.remaining_time_ms ?? 0));
    const nowIso = now.toISOString();

    // Сдвигаем kill_unlock_at и early_vote_available_at на длительность паузы,
    // чтобы таймеры, завязанные на «активное» время игры, не съедались паузой.
    let newKillUnlockAt: string | null = null;
    let newEarlyVoteAvailableAt: string | null = null;
    if (game.kill_unlock_at && game.paused_at) {
      const unlockTs = new Date(game.kill_unlock_at).getTime();
      const pausedTs = new Date(game.paused_at).getTime();
      newKillUnlockAt = new Date(unlockTs + (now.getTime() - pausedTs)).toISOString();
    } else if (game.kill_unlock_at) {
      newKillUnlockAt = game.kill_unlock_at;
    }

    if (game.early_vote_available_at && game.paused_at) {
      const earlyTs = new Date(game.early_vote_available_at).getTime();
      const pausedTs = new Date(game.paused_at).getTime();
      newEarlyVoteAvailableAt = new Date(earlyTs + (now.getTime() - pausedTs)).toISOString();
    } else if (game.early_vote_available_at) {
      newEarlyVoteAvailableAt = game.early_vote_available_at;
    }

    const updatePayload: Record<string, unknown> = {
      ends_at: newEndsAt.toISOString(),
      paused_at: null,
      remaining_time_ms: null,
      splash_event: null,
      updated_at: nowIso,
    };
    if (newKillUnlockAt !== null) {
      updatePayload.kill_unlock_at = newKillUnlockAt;
    }
    if (newEarlyVoteAvailableAt !== null) {
      updatePayload.early_vote_available_at = newEarlyVoteAvailableAt;
    }

    const { error: updateError } = await supabase
      .from('games')
      .update(updatePayload)
      .eq('id', room.current_game_id);

    if (updateError) {
      console.error('Resume update error:', updateError);
      return NextResponse.json({ error: 'Failed to resume' }, { status: 500 });
    }

    console.log('▶️ Game resumed, new ends at:', newEndsAt.toISOString());

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'game_resumed',
      payload: { endsAt: newEndsAt.toISOString() },
    });
    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resume error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}