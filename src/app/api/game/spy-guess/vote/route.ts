import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, playerId, vote } = await request.json();

    if (!roomId || !playerId || (vote !== 'yes' && vote !== 'no')) {
      return NextResponse.json({ error: 'Missing roomId, playerId or invalid vote (yes/no)' }, { status: 400 });
    }

    const { data: player } = await supabase
      .from('players')
      .select('is_spy, is_alive')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    if (player.is_spy) {
      return NextResponse.json({ error: 'Шпион не голосует за угадывание' }, { status: 403 });
    }
    if (!player.is_alive) {
      return NextResponse.json({ error: 'Мёртвые не голосуют' }, { status: 403 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('current_game_id')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id) {
      return NextResponse.json({ error: 'Нет активной игры' }, { status: 400 });
    }

    const { data: game } = await supabase
      .from('games')
      .select('spy_guess_status')
      .eq('id', room.current_game_id)
      .single();

    if (game?.spy_guess_status !== 'voting') {
      return NextResponse.json({ error: 'Голосование по угадыванию неактивно' }, { status: 400 });
    }

    const { error: voteError } = await supabase
      .from('spy_guess_votes')
      .upsert(
        { room_id: roomId, player_id: playerId, vote },
        { onConflict: 'room_id,player_id' }
      );

    if (voteError) throw voteError;

    const { data: votes } = await supabase
      .from('spy_guess_votes')
      .select('vote')
      .eq('room_id', roomId);
    const yesCount = votes?.filter((v) => v.vote === 'yes').length ?? 0;
    const noCount = votes?.filter((v) => v.vote === 'no').length ?? 0;
    const totalVotes = votes?.length ?? 0;

    const { data: eligiblePlayers } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_alive', true)
      .eq('is_spy', false);
    const eligibleCount = eligiblePlayers?.length ?? 0;

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    await channel.send({
      type: 'broadcast',
      event: 'spy_guess_vote',
      payload: { playerId, vote, yesCount, noCount },
    });
    if (eligibleCount > 0 && totalVotes >= eligibleCount) {
      await channel.send({
        type: 'broadcast',
        event: 'spy_guess_all_voted',
        payload: { totalVotes, eligibleCount },
      });
    }
    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true, yesCount, noCount });
  } catch (error) {
    console.error('Spy guess vote error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
