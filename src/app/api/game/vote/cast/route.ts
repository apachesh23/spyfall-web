import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, voterId, suspectId } = await request.json();

    if (!roomId || !voterId || !suspectId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Проверяем что голосующий жив
    const { data: voter } = await supabase
      .from('players')
      .select('is_alive')
      .eq('id', voterId)
      .single();

    if (!voter?.is_alive) {
      return NextResponse.json({ error: 'Мёртвые не голосуют' }, { status: 403 });
    }

    // Проверяем что комната в статусе голосования
    const { data: room } = await supabase
      .from('rooms')
      .select('voting_status')
      .eq('id', roomId)
      .single();

    if (room?.voting_status !== 'active') {
      return NextResponse.json({ error: 'Голосование неактивно' }, { status: 400 });
    }

    // Сохраняем голос
    const { error: voteError } = await supabase
      .from('votes')
      .upsert({
        room_id: roomId,
        voter_id: voterId,
        suspect_id: suspectId,
      }, {
        onConflict: 'room_id,voter_id'
      });

    if (voteError) throw voteError;

    console.log(`Vote cast: ${voterId} → ${suspectId}`);

    // Broadcast что кто-то проголосовал
    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
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