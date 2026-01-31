import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    const { data: room } = await supabase
      .from('rooms')
      .select('game_ends_at')
      .eq('id', roomId)
      .single();

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const now = Date.now();
    const endsAt = new Date(room.game_ends_at).getTime();
    const remainingMs = Math.max(0, endsAt - now);

    await supabase
      .from('rooms')
      .update({
        game_paused_at: new Date().toISOString(),
        remaining_time_ms: remainingMs,
      })
      .eq('id', roomId);

    console.log('⏸️ Game paused, remaining:', remainingMs, 'ms');

    // Broadcast паузы
    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'game_paused',
      payload: {}
    });

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}