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
  let channel: ReturnType<typeof supabase.channel> | null = null;

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

    const gameId = room.current_game_id;
    const now = new Date().toISOString();

    const { data: game } = await supabase
      .from('games')
      .select('id, spy_guess_status, spy_guess_ends_at, started_at, remaining_time_ms, paused_at, ends_at')
      .eq('id', gameId)
      .single();

    if (game?.spy_guess_status !== 'voting') {
      return NextResponse.json(
        { error: 'Голосование по угадыванию неактивно или уже завершено' },
        { status: 400 }
      );
    }

    const { data: votes } = await supabase
      .from('spy_guess_votes')
      .select('player_id, vote')
      .eq('room_id', roomId);

    const yesCount = votes?.filter((v) => v.vote === 'yes').length ?? 0;
    const noCount = votes?.filter((v) => v.vote === 'no').length ?? 0;
    const total = yesCount + noCount;

    const { data: aliveNonSpy } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_alive', true)
      .eq('is_spy', false);

    const eligibleCount = aliveNonSpy?.length ?? 0;
    const accepted = total > 0 && yesCount > noCount;

    const nowDate = new Date(now);

    // Если во время угадывания мы замораживали общий таймер (remaining_time_ms проставлен),
    // то при завершении возвращаем ends_at и очищаем паузу.
    const gameUpdate: Record<string, unknown> = {
      phase: accepted ? 'summary' : 'playing',
      ...(accepted
        ? {
            splash_event: {
              type: 'game_over_spy_win',
              at: now,
              ends_at: new Date(Date.now() + 5 * 1000).toISOString(),
            },
          }
        : {}),
      spy_guess_status: accepted ? 'accepted' : 'rejected',
      ...(accepted ? {} : { spy_guess_text: null, spy_guess_started_at: null, spy_guess_ends_at: null }),
      updated_at: now,
    };

    if (!accepted && game?.remaining_time_ms != null && game.remaining_time_ms > 0) {
      const newEndsAt = new Date(nowDate.getTime() + game.remaining_time_ms);
      gameUpdate.ends_at = newEndsAt.toISOString();
      gameUpdate.paused_at = null;
      gameUpdate.remaining_time_ms = null;
    }

    const { error: updateErr } = await supabase
      .from('games')
      .update(gameUpdate)
      .eq('id', gameId);

    if (updateErr) throw updateErr;

    await supabase.from('spy_guess_votes').delete().eq('room_id', roomId);

    if (accepted) {
      await supabase
        .from('rooms')
        .update({ status: 'finished', updated_at: now })
        .eq('id', roomId);
    }

    channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'spy_guess_finished',
      payload: { accepted, yesCount, noCount, total, eligibleCount },
    });
    await supabase.removeChannel(channel);

    // Логируем результат угадывания локации с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'spy_guess_result',
          payload: {
            room_id: roomId,
            accepted,
            yes_count: yesCount,
            no_count: noCount,
            total_votes: total,
            eligible_count: eligibleCount,
            game_time_sec: gameTimeSec,
          },
        });
    }

    return NextResponse.json({
      success: true,
      accepted,
      yesCount,
      noCount,
      total,
    });
  } catch (error) {
    console.error('Spy guess finish error:', error);
    if (channel) await supabase.removeChannel(channel);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
