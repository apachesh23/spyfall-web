// /api/game/vote/finish — состояние голосования в games

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

function computeGameTimeSec(startedAt: string | null, durationMin?: number | null) {
  if (!startedAt || !durationMin || durationMin <= 0) return null;
  const total = durationMin * 60;
  let elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (elapsed < 0) elapsed = 0;
  if (elapsed > total) elapsed = total;
  return elapsed;
}

export async function POST(request: Request) {
  let channel: RealtimeChannel | null = null;

  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    console.log('🏁 Finishing voting for room:', roomId);

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, current_game_id, code, settings')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('Room fetch error:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!room.current_game_id) {
      return NextResponse.json({ error: 'No active game' }, { status: 404 });
    }

    const gameId = room.current_game_id;

    const nowIso = new Date().toISOString();
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, voting_status, voting_phase, voting_round, revote_candidates, voting_type, started_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error('Game fetch error:', gameError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.voting_status !== 'active') {
      return NextResponse.json(
        { error: 'Голосование уже завершено', currentStatus: game.voting_status },
        { status: 400 }
      );
    }

    const phase = game.voting_phase as string | null;
    if (phase !== 'collecting' && phase !== 'revote') {
      return NextResponse.json(
        { error: 'Голосование уже завершено', currentStatus: phase ?? 'unknown' },
        { status: 400 }
      );
    }

    const { data: claimed, error: claimError } = await supabase
      .from('games')
      .update({ voting_phase: 'processing', updated_at: nowIso })
      .eq('id', gameId)
      .in('voting_phase', ['collecting', 'revote'])
      .select('id')
      .maybeSingle();

    if (claimError || !claimed) {
      return NextResponse.json(
        { error: 'Голосование уже завершено' },
        { status: 400 }
      );
    }

    const currentRound = game.voting_round || 1;
    const isFinalVoting = (game.voting_type as string) === 'final';
    const resultEndsAt = new Date(Date.now() + 5 * 1000).toISOString();

    channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Channel subscription timeout')), 10000);
      channel!.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, suspect_id')
      .eq('room_id', roomId);

    if (votesError) {
      if (channel) await supabase.removeChannel(channel);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Игроки, имеющие право голоса (живые на момент голосования)
    const { data: alivePlayersForAbstain } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_alive', true);
    const voterIds = new Set((votes ?? []).map((v) => v.voter_id));
    const abstainedIds: string[] = (alivePlayersForAbstain ?? [])
      .map((p) => p.id)
      .filter((id): id is string => id != null && !voterIds.has(id));

    const voteCounts: Record<string, number> = {};
    if (votes && votes.length > 0) {
      votes.forEach((v) => {
        if (v.suspect_id !== v.voter_id) {
          voteCounts[v.suspect_id] = (voteCounts[v.suspect_id] || 0) + 1;
        }
      });
    }

    const voteIds = Object.keys(voteCounts);
    const maxVotes = voteIds.length > 0 ? Math.max(...voteIds.map((id) => voteCounts[id])) : 0;
    const suspects = voteIds.filter((id) => voteCounts[id] === maxVotes);
    let result: Record<string, unknown> | null = null;

    const updateGameVoting = (updates: Record<string, unknown>) =>
      supabase.from('games').update({ ...updates, updated_at: nowIso }).eq('id', gameId);

    if (suspects.length > 1) {
      if (currentRound === 1) {
        const voteDuration = room.settings?.vote_duration ?? 1;
        const revoteEndsAt = new Date(Date.now() + voteDuration * 60 * 1000);

        const { error: updateErr } = await updateGameVoting({
          phase: 'voting',
          voting_round: 2,
          revote_candidates: suspects,
          voting_status: 'active',
          voting_phase: 'result_tie',
          voting_result_ends_at: resultEndsAt,
          voting_started_at: nowIso,
          voting_ends_at: revoteEndsAt.toISOString(),
        });

        if (updateErr) {
          if (channel) await supabase.removeChannel(channel);
          return NextResponse.json({ error: 'Failed to start revote' }, { status: 500 });
        }

        await supabase.from('votes').delete().eq('room_id', roomId);

        if (suspects[0] && suspects[1]) {
          await supabase.from('votes').insert([
            { room_id: roomId, voter_id: suspects[0], suspect_id: suspects[1] },
            { room_id: roomId, voter_id: suspects[1], suspect_id: suspects[0] },
          ]);
          await channel.send({ type: 'broadcast', event: 'vote_cast', payload: { voterId: suspects[0] } });
          await channel.send({ type: 'broadcast', event: 'vote_cast', payload: { voterId: suspects[1] } });
        }

        result = {
          type: 'tie_revote',
          candidates: suspects,
          voteCounts,
          revoteEndsAt: revoteEndsAt.toISOString(),
        };
      } else {
        // Повторное голосование снова 50/50
        if (isFinalVoting) {
          // Финальное: мирные не договорились — проигрыш
          await supabase.from('rooms').update({ status: 'finished', updated_at: nowIso }).eq('id', roomId);
          await updateGameVoting({
            phase: 'summary',
            splash_event: {
              type: 'game_over_spy_win_voting',
              at: nowIso,
              ends_at: resultEndsAt,
              winner: 'spies',
              voteCounts,
            },
            voting_phase: 'result_winner',
            voting_result_ends_at: resultEndsAt,
            voting_round: 1,
            revote_candidates: [],
          });
          await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);
          await supabase.from('votes').delete().eq('room_id', roomId);
          result = { type: 'final_civilians_lose', voteCounts, isFinal: true, winner: 'spies' };
        } else {
          await updateGameVoting({
            phase: 'playing',
            voting_phase: 'revote_result_no_vote',
            voting_result_ends_at: resultEndsAt,
            voting_round: 1,
            revote_candidates: [],
          });
          await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);
          await supabase.from('votes').delete().eq('room_id', roomId);
          result = { type: 'tie_failed', voteCounts };
        }
      }
    } else if (suspects.length === 0) {
      if (isFinalVoting) {
        // Финальное голосование: никто не выбран — мирные проиграли
        await supabase.from('rooms').update({ status: 'finished', updated_at: nowIso }).eq('id', roomId);
        await updateGameVoting({
          phase: 'summary',
          splash_event: {
            type: 'game_over_spy_win_voting',
            at: nowIso,
            ends_at: resultEndsAt,
            winner: 'spies',
            voteCounts: {},
          },
          voting_phase: 'result_winner',
          voting_result_ends_at: resultEndsAt,
          voting_round: 1,
          revote_candidates: [],
        });
        await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);
        await supabase.from('votes').delete().eq('room_id', roomId);
        result = { type: 'final_civilians_lose', voteCounts: {}, isFinal: true, winner: 'spies' };
      } else {
        await updateGameVoting({
          phase: 'playing',
          voting_phase: 'result_no_vote',
          voting_result_ends_at: resultEndsAt,
          voting_round: 1,
          revote_candidates: [],
        });
        await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);
        await supabase.from('votes').delete().eq('room_id', roomId);
        result = { type: 'no_elimination', voteCounts: {} };
      }
    } else {
      const eliminatedId = suspects[0];
      const { data: eliminated } = await supabase
        .from('players')
        .select('is_spy, nickname')
        .eq('id', eliminatedId)
        .single();

      await supabase.from('players').update({ is_alive: false, death_reason: 'voted' }).eq('id', eliminatedId);

      const wasSpy = eliminated?.is_spy ?? false;
      let isFinal = false;
      let winner: string | null = null;

      if (wasSpy) {
        isFinal = true;
        winner = 'civilians';
        await supabase.from('rooms').update({ status: 'finished', updated_at: nowIso }).eq('id', roomId);
        // Сначала показываем сплэш изгнания (все клиенты видят одно и то же), после ack — победу.
        const exileEndsAt = new Date(Date.now() + 10 * 1000).toISOString();
        await updateGameVoting({
          phase: 'summary',
          splash_event: {
            type: 'voting_kicked_civilian',
            at: nowIso,
            ends_at: exileEndsAt,
            winner: 'civilians',
            eliminatedId,
            wasSpy: true,
            voteCounts,
          },
          voting_phase: 'result_winner',
          voting_result_ends_at: resultEndsAt,
          voting_round: 1,
          revote_candidates: [],
        });
      } else {
        // Исключили мирного
        if (isFinalVoting) {
          // Финальное голосование: не нашли шпиона — победа шпионов
          isFinal = true;
          winner = 'spies';
          const exileEndsAt = new Date(Date.now() + 10 * 1000).toISOString();
          await supabase.from('rooms').update({ status: 'finished', updated_at: nowIso }).eq('id', roomId);
          await updateGameVoting({
            phase: 'summary',
            splash_event: {
              type: 'voting_final_transition',
              phase: 'exile',
              at: nowIso,
              exile_ends_at: exileEndsAt,
              winner: 'spies',
              eliminatedId,
              wasSpy: false,
              voteCounts,
            },
            voting_phase: 'result_winner',
            voting_result_ends_at: resultEndsAt,
            voting_round: 1,
            revote_candidates: [],
          });
        } else {
          const { data: alivePlayers } = await supabase
            .from('players')
            .select('id')
            .eq('room_id', roomId)
            .eq('is_alive', true);
          const aliveCount = alivePlayers?.length ?? 0;

          if (aliveCount < 3) {
            isFinal = true;
            winner = 'spies';
            const exileEndsAt = new Date(Date.now() + 10 * 1000).toISOString();
            await supabase.from('rooms').update({ status: 'finished', updated_at: nowIso }).eq('id', roomId);
            await updateGameVoting({
              phase: 'summary',
              splash_event: {
                type: 'voting_final_transition',
                phase: 'exile',
                at: nowIso,
                exile_ends_at: exileEndsAt,
                winner: 'spies',
                eliminatedId,
                wasSpy: false,
                voteCounts,
              },
              voting_phase: 'result_winner',
              voting_result_ends_at: resultEndsAt,
              voting_round: 1,
              revote_candidates: [],
            });
          } else {
            const votingKickedEndsAt = new Date(Date.now() + 10 * 1000).toISOString();
            await updateGameVoting({
              phase: 'playing',
              splash_event: {
                type: 'voting_kicked_civilian',
                at: nowIso,
                ends_at: votingKickedEndsAt,
                eliminatedId,
                wasSpy: false,
                voteCounts,
              },
              voting_phase: 'result_winner',
              voting_result_ends_at: resultEndsAt,
              voting_round: 1,
              revote_candidates: [],
            });
            await supabase.from('players').update({ wants_early_vote: false }).eq('room_id', roomId);
          }
        }
      }

      await supabase.from('votes').delete().eq('room_id', roomId);

      result = {
        type: 'eliminated',
        eliminatedId,
        wasSpy,
        isFinal,
        winner,
        voteCounts,
      };
    }

    const phaseForPayload =
      result?.type === 'no_elimination'
        ? 'result_no_vote'
        : result?.type === 'tie_failed'
          ? 'revote_result_no_vote'
          : result?.type === 'final_civilians_lose'
            ? 'result_winner'
            : result?.type === 'tie_revote'
              ? 'result_tie'
              : result?.type === 'eliminated'
                ? (currentRound === 2 ? 'revote_result_winner' : 'result_winner')
                : null;
    await channel.send({
      type: 'broadcast',
      event: 'voting_finished',
      payload: { result, phase: phaseForPayload },
    });

    await supabase.removeChannel(channel);

    // Логируем результат голосования с временем по игровому таймеру
    if (game?.id) {
      const gameTimeSec = computeGameTimeSec(
        (game as { started_at?: string | null }).started_at ?? null,
        room.settings?.game_duration ?? null,
      );
      await supabase
        .from('game_events')
        .insert({
          game_id: game.id,
          type: 'vote_result',
          payload: {
            room_id: roomId,
            phase: phaseForPayload,
            current_round: currentRound,
            is_final_voting: isFinalVoting,
            result,
            abstained_ids: abstainedIds,
            game_time_sec: gameTimeSec,
          },
        });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Finish voting error:', error);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (e) {
        console.error('Channel cleanup:', e);
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
