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
    const { roomId, spyId, targetId } = await request.json();

    if (!roomId || !spyId || !targetId) {
      return NextResponse.json({ error: 'Missing roomId, spyId or targetId' }, { status: 400 });
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
      .select('id, spy_action_type, started_at')
      .eq('id', room.current_game_id)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });
    }

    const hiddenThreat = !!room.settings?.mode_hidden_threat;
    if (!hiddenThreat) {
      return NextResponse.json({ error: 'Режим скрытой угрозы не активен' }, { status: 400 });
    }

    if (game.spy_action_type != null) {
      return NextResponse.json({ error: 'Действие шпиона уже использовано в этом раунде' }, { status: 400 });
    }

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, is_spy, is_alive')
      .eq('room_id', roomId);

    const spy = allPlayers?.find((p) => p.id === spyId);
    const target = allPlayers?.find((p) => p.id === targetId);

    if (!spy?.is_spy || !spy.is_alive) {
      return NextResponse.json({ error: 'Только живой шпион может устранить игрока' }, { status: 403 });
    }

    if (!target || !target.is_alive || target.id === spyId) {
      return NextResponse.json({ error: 'Некорректная цель для устранения' }, { status: 400 });
    }

    const aliveCount = allPlayers?.filter((p) => p.is_alive).length ?? 0;
    if (aliveCount <= 3) {
      return NextResponse.json({ error: 'Устранение недоступно при 3 или менее живых игроках' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const { error: killErr } = await supabase
      .from('players')
      .update({ is_alive: false, death_reason: 'killed' })
      .eq('id', targetId);

    if (killErr) {
      console.error('Spy kill update player error:', killErr);
      return NextResponse.json({ error: 'Не удалось устранить игрока' }, { status: 500 });
    }

    const { error: gameErr } = await supabase
      .from('games')
      .update({
        spy_action_type: 'kill',
        spy_action_used_at: nowIso,
        last_spy_kill_target: targetId,
        splash_event: {
          type: 'spy_kill',
          target_id: targetId,
          at: nowIso,
        },
        updated_at: nowIso,
      })
      .eq('id', game.id);

    if (gameErr) {
      console.error('Spy kill update game error:', gameErr);
      return NextResponse.json({ error: 'Не удалось обновить состояние игры' }, { status: 500 });
    }

    // Логируем устранение шпионом с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'spy_kill',
          payload: {
            room_id: roomId,
            spy_id: spyId,
            target_id: targetId,
            game_time_sec: gameTimeSec,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Spy kill error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

