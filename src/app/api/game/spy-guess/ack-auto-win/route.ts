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

/** Вызывается клиентом по окончании 10 сек на сплэше авто-вина: помечаем игру завершённой, шпион победил. */
export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, current_game_id, settings')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id) {
      return NextResponse.json({ error: 'Нет активной игры' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data: game } = await supabase
      .from('games')
      .select('id, spy_guess_status, started_at')
      .eq('id', room.current_game_id)
      .single();

    if (game?.spy_guess_status !== 'auto_win') {
      return NextResponse.json({ error: 'Не в режиме авто-вина' }, { status: 400 });
    }

    // Только один клиент должен записать событие: обновляем только если статус всё ещё auto_win
    const { data: claimed, error: updateError } = await supabase
      .from('games')
      .update({
        phase: 'summary',
        spy_guess_status: 'accepted',
        splash_event: {
          type: 'game_over_spy_win',
          at: now,
          ends_at: new Date(Date.now() + 5 * 1000).toISOString(),
          winner: 'spies',
        },
        updated_at: now,
      })
      .eq('id', room.current_game_id)
      .eq('spy_guess_status', 'auto_win')
      .select('id')
      .maybeSingle();

    if (updateError || !claimed) {
      // Уже обработал другой клиент — просто успех, без повторной записи события
      return NextResponse.json({ success: true });
    }

    const gameTimeSec = computeGameTimeSec(
      game?.started_at ?? null,
      room.settings?.game_duration ?? null,
    );
    await supabase.from('game_events').insert({
      game_id: room.current_game_id,
      type: 'spy_guess_result',
      payload: {
        accepted: true,
        auto_win: true,
        game_time_sec: gameTimeSec,
      },
    });

    await supabase
      .from('rooms')
      .update({ status: 'finished', updated_at: now })
      .eq('id', roomId);

    const channel = supabase.channel(`room-${roomId}`);
    try {
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      });
      await channel.send({
        type: 'broadcast',
        event: 'spy_guess_auto_win_acked',
        payload: {},
      });
    } finally {
      await supabase.removeChannel(channel);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Spy guess ack-auto-win error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
