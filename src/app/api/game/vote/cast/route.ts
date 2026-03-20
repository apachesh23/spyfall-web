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
    const { roomId, voterId, suspectId, skip } = await request.json();

    if (!roomId || !voterId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }
    const isSkip = !!skip;
    if (!isSkip && !suspectId) {
      return NextResponse.json({ error: 'Missing suspectId or skip' }, { status: 400 });
    }
    const effectiveSuspectId = isSkip ? voterId : suspectId;

    // Проверяем что голосующий жив
    const { data: voter } = await supabase
      .from('players')
      .select('is_alive')
      .eq('id', voterId)
      .single();

    if (!voter?.is_alive) {
      return NextResponse.json({ error: 'Мёртвые не голосуют' }, { status: 403 });
    }

    // Проверяем что у комнаты есть активная игра и она в статусе голосования
    const { data: room } = await supabase
      .from('rooms')
      .select('current_game_id, settings')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id) {
      return NextResponse.json({ error: 'Нет активной игры' }, { status: 400 });
    }

    const { data: game } = await supabase
      .from('games')
      .select('id, voting_status, started_at')
      .eq('id', room.current_game_id)
      .single();

    if (game?.voting_status !== 'active') {
      return NextResponse.json({ error: 'Голосование неактивно' }, { status: 400 });
    }

    // Сохраняем голос (при skip — suspect_id = voter_id, в finish не учитывается)
    const { error: voteError } = await supabase
      .from('votes')
      .upsert({
        room_id: roomId,
        voter_id: voterId,
        suspect_id: effectiveSuspectId,
      }, {
        onConflict: 'room_id,voter_id'
      });

    if (voteError) throw voteError;

    // Логируем событие голосования с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'vote_cast',
          payload: {
            room_id: roomId,
            voter_id: voterId,
            suspect_id: suspectId ?? null,
            skip: isSkip,
            game_time_sec: gameTimeSec,
          },
        });
    }

    console.log(`Vote cast: ${voterId} → ${isSkip ? 'skip' : suspectId}`);

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'vote_cast',
      payload: { voterId }
    });

    // Проверяем все ли проголосовали
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_alive', true);

    const { data: allVotes } = await supabase
      .from('votes')
      .select('voter_id')
      .eq('room_id', roomId);

    const totalPlayers = allPlayers?.length || 0;
    const totalVotes = allVotes?.length || 0;

    console.log(`Votes: ${totalVotes}/${totalPlayers}`);

    // ИЗМЕНЕНИЕ! Только отправляем уведомление, не завершаем
    if (totalVotes >= totalPlayers) {
      console.log('✅ All votes collected! Ready to finish');
      await channel.send({
        type: 'broadcast',
        event: 'all_votes_collected',
        payload: { totalVotes, totalPlayers }
      });
    }

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Vote cast error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}