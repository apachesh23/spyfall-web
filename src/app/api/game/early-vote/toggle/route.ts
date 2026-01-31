import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { pauseGameTimer } from '@/lib/game/timer';

export async function POST(request: Request) {
  try {
    const { roomId, playerId } = await request.json();

    if (!roomId || !playerId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: player } = await supabase
      .from('players')
      .select('wants_early_vote, is_alive')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }

    if (!player.is_alive) {
      return NextResponse.json({ error: 'Мёртвые не голосуют' }, { status: 403 });
    }

    const newState = !player.wants_early_vote;
    
    await supabase
      .from('players')
      .update({ wants_early_vote: newState })
      .eq('id', playerId);

    console.log(`Player ${playerId} early vote: ${newState}`);

    const { data: alivePlayers } = await supabase
      .from('players')
      .select('id, wants_early_vote')
      .eq('room_id', roomId)
      .eq('is_alive', true);

    const totalAlive = alivePlayers?.length || 0;
    const wantsVote = alivePlayers?.filter(p => p.wants_early_vote).length || 0;

    console.log(`Early vote progress: ${wantsVote}/${totalAlive}`);

    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'early_vote_updated',
      payload: { 
        playerId,
        wantsVote: newState,
        totalVotes: wantsVote,
        totalPlayers: totalAlive
      }
    });

    const threshold = Math.ceil(totalAlive / 2);
    const shouldStartVoting = wantsVote >= threshold;

    console.log(`Threshold check: ${wantsVote} >= ${threshold} = ${shouldStartVoting}`);

    if (shouldStartVoting) {
      console.log('🗳️ Starting voting! Threshold reached');
      
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('settings')
          .eq('id', roomId)
          .single();

        const voteDuration = room?.settings?.vote_duration || 1;
        const votingEndsAt = new Date(Date.now() + voteDuration * 60 * 1000);

        console.log('Voting duration:', voteDuration, 'minutes');
        console.log('Voting ends at:', votingEndsAt);

        // Обновляем статус комнаты
        const { error: updateError } = await supabase
          .from('rooms')
          .update({
            voting_status: 'active',
            voting_started_at: new Date().toISOString(),
            voting_ends_at: votingEndsAt.toISOString()
          })
          .eq('id', roomId);

        if (updateError) {
          console.error('Failed to update room:', updateError);
          throw updateError;
        }

        console.log('Room status updated to voting');

        // Сбрасываем wants_early_vote у всех
        const { error: resetError } = await supabase
          .from('players')
          .update({ wants_early_vote: false })
          .eq('room_id', roomId);

        if (resetError) {
          console.error('Failed to reset wants_early_vote:', resetError);
        }

        console.log('Reset wants_early_vote for all players');

        // Ставим таймер игры на паузу
        console.log('Calling pauseGameTimer...');
        try {
          await pauseGameTimer(roomId, channel); // ← Передаём channel
          console.log('✅ Game timer paused successfully');
        } catch (pauseError) {
          console.error('❌ Pause timer failed:', pauseError);
        }

        // Broadcast старт голосования
        console.log('Broadcasting voting_started...');
        await channel.send({
          type: 'broadcast',
          event: 'voting_started',
          payload: { 
            endsAt: votingEndsAt.toISOString()
          }
        });

        console.log('✅ Voting started successfully!');

      } catch (votingError) {
        console.error('❌ Error starting voting:', votingError);
        // Не возвращаем ошибку, чтобы toggle всё равно сработал
      }
    }

    await supabase.removeChannel(channel);

    return NextResponse.json({ 
      success: true,
      wantsVote: newState,
      votingStarted: shouldStartVoting
    });

  } catch (error) {
    console.error('❌ Early vote error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}