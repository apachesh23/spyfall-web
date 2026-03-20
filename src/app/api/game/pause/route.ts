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
      return NextResponse.json({ error: 'Room not found or only host can pause' }, { status: 403 });
    }

    const { data: game } = await supabase
      .from('games')
      .select('ends_at')
      .eq('id', room.current_game_id)
      .single();

    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    const now = Date.now();
    const endsAt = new Date(game.ends_at).getTime();
    const remainingMs = Math.max(0, endsAt - now);
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('games')
      .update({
        paused_at: nowIso,
        remaining_time_ms: remainingMs,
        splash_event: { type: 'system_pause', at: nowIso },
        updated_at: nowIso,
      })
      .eq('id', room.current_game_id);

    if (updateError) {
      console.error('Pause update error:', updateError);
      return NextResponse.json({ error: 'Failed to pause' }, { status: 500 });
    }

    console.log('⏸️ Game paused, remaining:', remainingMs, 'ms');

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({ type: 'broadcast', event: 'game_paused', payload: {} });
    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}