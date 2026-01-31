import { supabase } from '@/lib/supabase/client';

export async function pauseGameTimer(roomId: string, channel: any) {
  try {
    console.log('⏸️ Pausing game timer for room:', roomId);

    const { data: room } = await supabase
      .from('rooms')
      .select('game_ends_at')
      .eq('id', roomId)
      .single();

    if (!room) {
      console.error('Room not found');
      return;
    }

    const now = Date.now();
    const endsAt = new Date(room.game_ends_at).getTime();
    const remainingMs = Math.max(0, endsAt - now);

    console.log('Remaining time:', remainingMs, 'ms');

    await supabase
      .from('rooms')
      .update({
        game_paused_at: new Date().toISOString(),
        remaining_time_ms: remainingMs,
      })
      .eq('id', roomId);

    console.log('DB updated, sending broadcast...');

    // Используем переданный channel
    await channel.send({
      type: 'broadcast',
      event: 'game_paused',
      payload: {}
    });

    console.log('✅ Pause broadcast sent');

  } catch (error) {
    console.error('❌ Pause timer error:', error);
  }
}

export async function resumeGameTimer(roomId: string, channel: any) {
  try {
    console.log('▶️ Resuming game timer for room:', roomId);

    const { data: room } = await supabase
      .from('rooms')
      .select('remaining_time_ms')
      .eq('id', roomId)
      .single();

    if (!room || !room.remaining_time_ms) {
      console.error('No remaining time found');
      return;
    }

    const newEndsAt = new Date(Date.now() + room.remaining_time_ms);

    console.log('New ends at:', newEndsAt);

    await supabase
      .from('rooms')
      .update({
        game_ends_at: newEndsAt.toISOString(),
        game_paused_at: null,
        remaining_time_ms: null,
      })
      .eq('id', roomId);

    console.log('DB updated, sending broadcast...');

    // Используем переданный channel
    await channel.send({
      type: 'broadcast',
      event: 'game_resumed',
      payload: { endsAt: newEndsAt.toISOString() }
    });

    console.log('✅ Resume broadcast sent');

  } catch (error) {
    console.error('❌ Resume timer error:', error);
  }
}