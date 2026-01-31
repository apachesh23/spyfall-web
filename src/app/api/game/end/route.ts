import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Проверяем что завершает ведущий
    const { data: host } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', hostId)
      .eq('room_id', roomId)
      .single();

    if (!host?.is_host) {
      return NextResponse.json({ error: 'Только ведущий может завершить игру' }, { status: 403 });
    }

    console.log('🏁 Ending game for room:', roomId);

    // Сбрасываем состояние комнаты в 'waiting'
    await supabase
      .from('rooms')
      .update({
        status: 'waiting',
        voting_status: 'none',
        location_id: null,
        selected_theme: null,
        spy_ids: [],
        game_started_at: null,
        game_ends_at: null,
        voting_started_at: null,
        voting_ends_at: null,
      })
      .eq('id', roomId);

    // Сбрасываем игроков
    await supabase
      .from('players')
      .update({
        is_spy: false,
        role: null,
        is_alive: true,
        wants_early_vote: false,
      })
      .eq('room_id', roomId);

    // Очищаем голоса (на всякий случай)
    await supabase
      .from('votes')
      .delete()
      .eq('room_id', roomId);

    console.log('✅ Game reset to waiting state');

    // Broadcast всем вернуться в комнату
    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    const { data: room } = await supabase
      .from('rooms')
      .select('code')
      .eq('id', roomId)
      .single();

    await channel.send({
      type: 'broadcast',
      event: 'game_ended',
      payload: { roomCode: room?.code }
    });

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('End game error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}