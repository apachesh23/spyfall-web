import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { isSpyGuessMatch } from '@/lib/spy-guess';

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
    const { roomId, playerId, guessText } = await request.json();

    if (!roomId || !playerId || guessText == null || String(guessText).trim() === '') {
      return NextResponse.json({ error: 'Missing roomId, playerId or guessText' }, { status: 400 });
    }

    const trimmed = String(guessText).trim();

    const { data: player } = await supabase
      .from('players')
      .select('is_spy, is_alive')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single();

    if (!player?.is_spy) {
      return NextResponse.json({ error: 'Только шпион может назвать локацию' }, { status: 403 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, current_game_id, settings')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id) {
      return NextResponse.json({ error: 'Нет активной игры' }, { status: 400 });
    }

    const { data: game } = await supabase
      .from('games')
      .select('id, location_id, spy_guess_status, spy_action_type, started_at, ends_at, paused_at, remaining_time_ms')
      .eq('id', room.current_game_id)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });
    }

    const allowedStatuses = ['none', 'rejected'];
    if (game.spy_guess_status && !allowedStatuses.includes(game.spy_guess_status)) {
      return NextResponse.json({ error: 'Угадывание уже идёт или завершено' }, { status: 400 });
    }

    // Одна попытка угадать локацию за раунд: если уже использовали действие — запрещаем повторную отправку
    if (game.spy_action_type != null) {
      return NextResponse.json({ error: 'Действие шпиона уже использовано в этом раунде' }, { status: 400 });
    }

    const { data: location } = await supabase
      .from('locations')
      .select('name')
      .eq('id', game.location_id)
      .single();

    const locationName = location?.name ?? '';

    const autoWin = isSpyGuessMatch(trimmed, locationName);
    const now = new Date();
    const nowIso = now.toISOString();
    const voteDurationMin = (room.settings?.vote_duration ?? 1);
    const endsAt = autoWin
      ? new Date(now.getTime() + 10 * 1000)
      : new Date(now.getTime() + voteDurationMin * 60 * 1000);

    // Если игра уже на паузе, не трогаем таймер; если нет — "замораживаем" общий таймер игры на время угадывания
    let remainingTimeMs: number | null = null;
    if (!game.paused_at && game.ends_at && game.remaining_time_ms == null) {
      const endsTs = new Date(game.ends_at as string).getTime();
      const diff = endsTs - now.getTime();
      remainingTimeMs = diff > 0 ? diff : 0;
    }

    const gameUpdate: Record<string, unknown> = {
      phase: 'spy_guess',
      spy_guess_text: trimmed,
      spy_guess_status: autoWin ? 'auto_win' : 'voting',
      spy_guess_started_at: nowIso,
      spy_guess_ends_at: endsAt.toISOString(),
      spy_action_type: 'guess',
      spy_action_used_at: nowIso,
      updated_at: nowIso,
    };
    if (remainingTimeMs != null) {
      gameUpdate.paused_at = nowIso;
      gameUpdate.remaining_time_ms = remainingTimeMs;
    }

    const { error: updateErr } = await supabase
      .from('games')
      .update(gameUpdate)
      .eq('id', game.id);

    if (updateErr) throw updateErr;

    // Логируем старт угадывания локации с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'spy_guess_started',
          payload: {
            room_id: roomId,
            player_id: playerId,
            guess_text: trimmed,
            auto_win: autoWin,
            ends_at: endsAt.toISOString(),
            game_time_sec: gameTimeSec,
          },
        });
    }

    if (!autoWin) {
      await supabase.from('spy_guess_votes').delete().eq('room_id', roomId);
    }

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'spy_guess_started',
      payload: { autoWin, guessText: trimmed, endsAt: endsAt.toISOString() },
    });
    await supabase.removeChannel(channel);

    return NextResponse.json({
      success: true,
      autoWin,
      endsAt: endsAt.toISOString(),
    });
  } catch (error) {
    console.error('Spy guess error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
