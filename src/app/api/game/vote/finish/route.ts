import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { resumeGameTimer } from '@/lib/game/timer';

export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    console.log('🏁 Finishing voting for room:', roomId);

    // Создаём channel сразу
    const channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    // Получаем комнату
    const { data: room } = await supabase
      .from('rooms')
      .select('voting_status, voting_round, revote_candidates')
      .eq('id', roomId)
      .single();

    if (room?.voting_status !== 'active') {
      await supabase.removeChannel(channel);
      return NextResponse.json({ error: 'Голосование неактивно' }, { status: 400 });
    }

    const currentRound = room.voting_round || 1;
    const revoteCandidates = room.revote_candidates || [];

    console.log('Current round:', currentRound);
    console.log('Revote candidates:', revoteCandidates);

    // Подсчитываем голоса
    const { data: votes } = await supabase
      .from('votes')
      .select('suspect_id')
      .eq('room_id', roomId);

    if (!votes || votes.length === 0) {
      console.log('No votes found');
      await supabase.removeChannel(channel);
      return NextResponse.json({ error: 'Нет голосов' }, { status: 400 });
    }

    // Считаем голоса за каждого
    const voteCounts: Record<string, number> = {};
    votes.forEach(vote => {
      voteCounts[vote.suspect_id] = (voteCounts[vote.suspect_id] || 0) + 1;
    });

    console.log('Vote counts:', voteCounts);

    // Находим максимум
    const maxVotes = Math.max(...Object.values(voteCounts));
    const suspects = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

    console.log('Max votes:', maxVotes, 'Suspects:', suspects);

    let result = null;

    // НИЧЬЯ (2+ игрока с одинаковым кол-вом голосов)
    if (suspects.length > 1) {
      if (currentRound === 1) {
        // Первый раунд - запускаем повторное голосование
        console.log('🔄 Tie in round 1, starting revote');

        await supabase
          .from('rooms')
          .update({
            voting_round: 2,
            revote_candidates: suspects,
            voting_status: 'none',
          })
          .eq('id', roomId);

        await supabase
          .from('votes')
          .delete()
          .eq('room_id', roomId);

        result = {
          type: 'tie_revote',
          candidates: suspects,
          voteCounts
        };

      } else {
        // Второй раунд - голосование недействительно
        console.log('🤝 Tie in round 2, voting failed');

        await supabase
          .from('rooms')
          .update({
            voting_status: 'none',
            voting_round: 1,
            revote_candidates: [],
          })
          .eq('id', roomId);

        await supabase
          .from('players')
          .update({ wants_early_vote: false })
          .eq('room_id', roomId);

        await supabase
          .from('votes')
          .delete()
          .eq('room_id', roomId);

        result = {
          type: 'tie_failed',
          voteCounts
        };

        // Возобновляем таймер игры
        try {
          await resumeGameTimer(roomId, channel);
          console.log('✅ Game timer resumed after tie');
        } catch (err) {
          console.error('❌ Resume timer error:', err);
        }
      }
    } 
    // ЕСТЬ ПОБЕДИТЕЛЬ
    else {
      const eliminatedId = suspects[0];

      const { data: eliminated } = await supabase
        .from('players')
        .select('is_spy, nickname')
        .eq('id', eliminatedId)
        .single();

      console.log('☠️ Eliminated:', eliminated?.nickname, 'Was spy:', eliminated?.is_spy);

      await supabase
        .from('players')
        .update({ is_alive: false })
        .eq('id', eliminatedId);

      const wasSpy = eliminated?.is_spy || false;
      let isFinal = false;
      let winner = null;

      if (wasSpy) {
        // Убили шпиона - мирные победили!
        isFinal = true;
        winner = 'civilians';

        await supabase
          .from('rooms')
          .update({
            status: 'finished',
            winner: 'civilians',
            voting_status: 'finished',
            voting_round: 1,
            revote_candidates: [],
          })
          .eq('id', roomId);

      } else {
        // Убили мирного - проверяем можно ли продолжать
        const { data: alivePlayers } = await supabase
          .from('players')
          .select('id')
          .eq('room_id', roomId)
          .eq('is_alive', true);

        const aliveCount = alivePlayers?.length || 0;
        console.log('Alive players after elimination:', aliveCount);

        if (aliveCount < 3) {
          // Меньше 3 игроков - шпион победил
          isFinal = true;
          winner = 'spies';

          await supabase
            .from('rooms')
            .update({
              status: 'finished',
              winner: 'spies',
              voting_status: 'finished',
              voting_round: 1,
              revote_candidates: [],
            })
            .eq('id', roomId);

        } else {
          // Можно продолжать игру
          isFinal = false;

          await supabase
            .from('rooms')
            .update({
              voting_status: 'none',
              voting_round: 1,
              revote_candidates: [],
            })
            .eq('id', roomId);

          await supabase
            .from('players')
            .update({ wants_early_vote: false })
            .eq('room_id', roomId);

          // Возобновляем таймер игры
          try {
            await resumeGameTimer(roomId, channel);
            console.log('✅ Game timer resumed after civilian elimination');
          } catch (err) {
            console.error('❌ Resume timer error:', err);
          }
        }
      }

      // Очищаем голоса
      await supabase
        .from('votes')
        .delete()
        .eq('room_id', roomId);

      result = {
        type: 'eliminated',
        eliminatedId,
        wasSpy,
        isFinal,
        winner,
        voteCounts
      };
    }

    // Broadcast результата
    await channel.send({
      type: 'broadcast',
      event: 'voting_finished',
      payload: { result }
    });

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Finish voting error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}