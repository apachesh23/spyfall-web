// УПРОЩЕННАЯ ВЕРСИЯ /api/game/vote/finish/route.ts
// Убраны таймауты, теперь только 1 клиент вызывает API

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { resumeGameTimer } from '@/lib/game/timer';

export async function POST(request: Request) {
  let channel: any = null;
  
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    console.log('🏁 Finishing voting for room:', roomId);

    // Проверяем текущий статус комнаты
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('voting_status, voting_round, revote_candidates')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Room fetch error:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room?.voting_status !== 'active') {
      console.log('⚠️ Voting already finished, status:', room?.voting_status);
      return NextResponse.json({ 
        error: 'Голосование уже завершено',
        currentStatus: room?.voting_status 
      }, { status: 400 });
    }

    const currentRound = room.voting_round || 1;
    const revoteCandidates = room.revote_candidates || [];

    console.log('Current round:', currentRound);
    console.log('Revote candidates:', revoteCandidates);

    // Создаём channel БЕЗ ТАЙМАУТА (т.к. только 1 клиент вызывает)
    channel = supabase.channel(`game-${roomId}`);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Channel subscription timeout after 10s'));
      }, 10000); // Увеличили до 10 сек для подстраховки
      
      channel.subscribe((status: string) => {  // ← добавлен тип string
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });
    
    console.log('✅ Channel subscribed successfully');

    // Подсчитываем голоса
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('suspect_id')
      .eq('room_id', roomId);

    if (votesError) {
      console.error('Votes fetch error:', votesError);
      if (channel) await supabase.removeChannel(channel);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    if (!votes || votes.length === 0) {
      console.log('No votes found');
      if (channel) await supabase.removeChannel(channel);
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
    
        // Вычисляем новое время окончания revote
        const { data: roomData } = await supabase
          .from('rooms')
          .select('settings')
          .eq('id', roomId)
          .single();
    
        const voteDuration = roomData?.settings?.vote_duration || 1;
        const revoteEndsAt = new Date(Date.now() + voteDuration * 60 * 1000);
    
        console.log('Revote duration:', voteDuration, 'minutes');
        console.log('Revote ends at:', revoteEndsAt);
        console.log('Candidates:', suspects);
    
        // Обновляем комнату для revote
        const { error: updateError } = await supabase
          .from('rooms')
          .update({
            voting_round: 2,
            revote_candidates: suspects,
            voting_status: 'active',
            voting_started_at: new Date().toISOString(),
            voting_ends_at: revoteEndsAt.toISOString(),
          })
          .eq('id', roomId);
    
        if (updateError) {
          console.error('Failed to update room for revote:', updateError);
          if (channel) await supabase.removeChannel(channel);
          return NextResponse.json({ error: 'Failed to start revote' }, { status: 500 });
        }
    
        // Очищаем старые голоса
        await supabase
          .from('votes')
          .delete()
          .eq('room_id', roomId);
    
        // НОВОЕ: Автоматически создаем голоса кандидатов друг за друга
        console.log('🤖 Creating auto-votes for candidates');
        
        try {
          // Кандидат 1 голосует за кандидата 2
          const { error: vote1Error } = await supabase
            .from('votes')
            .insert({
              room_id: roomId,
              voter_id: suspects[0],
              suspect_id: suspects[1],
              created_at: new Date().toISOString(),
            });
    
          if (vote1Error) {
            console.error('Auto-vote 1 error:', vote1Error);
          }
    
          // Кандидат 2 голосует за кандидата 1  
          const { error: vote2Error } = await supabase
            .from('votes')
            .insert({
              room_id: roomId,
              voter_id: suspects[1],
              suspect_id: suspects[0],
              created_at: new Date().toISOString(),
            });
    
          if (vote2Error) {
            console.error('Auto-vote 2 error:', vote2Error);
          }
    
          if (!vote1Error && !vote2Error) {
            console.log('✅ Auto-votes created successfully');
            
            // Отправляем broadcast об автоголосах
            await channel.send({
              type: 'broadcast',
              event: 'vote_cast',
              payload: { voterId: suspects[0] }
            });
            
            await channel.send({
              type: 'broadcast',
              event: 'vote_cast',
              payload: { voterId: suspects[1] }
            });
          }
        } catch (autoVoteError) {
          console.error('❌ Auto-vote creation failed:', autoVoteError);
          // Не фейлим весь запрос, продолжаем
        }
    
        result = {
          type: 'tie_revote',
          candidates: suspects,
          voteCounts,
          revoteEndsAt: revoteEndsAt.toISOString(),
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

    // Отправка broadcast
    try {
      await channel.send({
        type: 'broadcast',
        event: 'voting_finished',
        payload: { result }
      });
      console.log('✅ Broadcast sent successfully');
    } catch (broadcastError) {
      console.error('⚠️ Broadcast failed:', broadcastError);
      // Не фейлим запрос если broadcast не прошел
    }

    // Закрываем channel
    try {
      await supabase.removeChannel(channel);
      console.log('✅ Channel removed');
    } catch (removeError) {
      console.error('⚠️ Channel removal failed:', removeError);
    }

    console.log('✅ Finish voting completed successfully');
    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('❌ Finish voting error:', error);
    
    // Очищаем channel если был создан
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (err) {
        console.error('Channel cleanup error:', err);
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}