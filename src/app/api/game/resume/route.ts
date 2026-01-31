import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    const { data: room } = await supabase
      .from('rooms')
      .select('remaining_time_ms')
      .eq('id', roomId)
      .single();

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    const newEndsAt = new Date(Date.now() + room.remaining_time_ms);

    await supabase
      .from('rooms')
      .update({
        game_ends_at: newEndsAt.toISOString(),
        game_paused_at: null,
        remaining_time_ms: null,
      })
      .eq('id', roomId);

    console.log('▶️ Game resumed, new ends at:', newEndsAt);

    // Broadcast возобновления
    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'game_resumed',
      payload: { endsAt: newEndsAt.toISOString() }
    });

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resume error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}