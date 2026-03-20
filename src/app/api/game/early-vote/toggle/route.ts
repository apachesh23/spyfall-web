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

const EARLY_VOTE_MAX_USES = 2;
// TODO DEBUG: 10 сек для теста; вернуть 3 для продакшена (минуты)
const EARLY_VOTE_COOLDOWN_SEC = 10;

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
    const wantsVote = alivePlayers?.filter((p) => p.wants_early_vote).length || 0;

    console.log(`Early vote progress: ${wantsVote}/${totalAlive}`);

    const channel = supabase.channel(`room-${roomId}`);
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'early_vote_updated',
      payload: {
        playerId,
        wantsVote: newState,
        totalVotes: wantsVote,
        totalPlayers: totalAlive,
      },
    });

    // Большинство живых: 2 из 3, 3 из 4, 4 из 5 и т.д.
    const threshold = Math.ceil(totalAlive / 2);
    let shouldStartVoting = wantsVote >= threshold;

    if (shouldStartVoting) {
      console.log(`Threshold check: ${wantsVote} >= ${threshold} = ${shouldStartVoting}`);

      const { data: room } = await supabase
      .from('rooms')
      .select('current_game_id, settings')
        .eq('id', roomId)
        .single();

      if (!room?.current_game_id) {
        console.error('No active game for room');
        await supabase.removeChannel(channel);
        return NextResponse.json({ success: true, wantsVote: newState, votingStarted: false });
      }

      const { data: game } = await supabase
        .from('games')
        .select('id, ends_at, early_vote_used_count, early_vote_available_at, started_at')
        .eq('id', room.current_game_id)
        .single();

      const now = new Date();
      const usedCount = game?.early_vote_used_count ?? 0;
      const availableAt =
        game?.early_vote_available_at != null ? new Date(game.early_vote_available_at) : null;

      if (usedCount >= EARLY_VOTE_MAX_USES) {
        console.log('🚫 Early vote limit reached, not starting voting');
        shouldStartVoting = false;
      } else if (availableAt && now < availableAt) {
        console.log(
          '⏳ Early vote on cooldown until',
          availableAt.toISOString(),
          ' — current:',
          now.toISOString(),
        );
        shouldStartVoting = false;
      }

      if (shouldStartVoting) {
        console.log('🗳️ Starting early voting! Threshold and timing conditions met');

        const voteDuration = room?.settings?.vote_duration ?? 1;
        const votingEndsAt = new Date(Date.now() + voteDuration * 60 * 1000);
        const nowIso = now.toISOString();

        console.log('Voting duration:', voteDuration, 'min, ends at:', votingEndsAt.toISOString());

        const remainingMs =
          game?.ends_at != null
            ? Math.max(0, new Date(game.ends_at).getTime() - Date.now())
            : 0;

        const nextUsedCount = usedCount + 1;
        const cooldownMs = EARLY_VOTE_COOLDOWN_SEC * 1000;
        const nextAvailableAt =
          nextUsedCount >= EARLY_VOTE_MAX_USES
            ? null
            : new Date(now.getTime() + cooldownMs).toISOString();

        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            phase: 'voting',
            voting_status: 'active',
            voting_phase: 'collecting',
            voting_type: 'early',
            voting_started_at: nowIso,
            voting_ends_at: votingEndsAt.toISOString(),
            voting_result_ends_at: null,
            paused_at: nowIso,
            remaining_time_ms: remainingMs,
            splash_event: null,
            updated_at: nowIso,
            early_vote_used_count: nextUsedCount,
            early_vote_available_at: nextAvailableAt,
          })
          .eq('id', room.current_game_id);

        if (gameUpdateError) {
          console.error('Failed to update game for voting:', gameUpdateError);
          await supabase.removeChannel(channel);
          return NextResponse.json({ success: true, wantsVote: newState, votingStarted: false });
        }

        // Логируем старт досрочного голосования с временем по игровому таймеру
        if (game?.id) {
          const gameTimeSec = computeGameTimeSec(
            (game as { started_at?: string | null }).started_at ?? null,
            room.settings?.game_duration ?? null,
          );
          await supabase
            .from('game_events')
            .insert({
              game_id: game.id,
              type: 'voting_started_early',
              payload: {
                room_id: roomId,
                voting_type: 'early',
                ends_at: votingEndsAt.toISOString(),
                game_time_sec: gameTimeSec,
              },
            });
        }

        const { error: resetError } = await supabase
          .from('players')
          .update({ wants_early_vote: false })
          .eq('room_id', roomId);

        if (resetError) console.error('Failed to reset wants_early_vote:', resetError);

        await channel.send({
          type: 'broadcast',
          event: 'voting_started',
          payload: { endsAt: votingEndsAt.toISOString() },
        });

        console.log('✅ Voting started successfully');
      }
    }

    await supabase.removeChannel(channel);

    return NextResponse.json({
      success: true,
      wantsVote: newState,
      votingStarted: !!shouldStartVoting,
    });
  } catch (error) {
    console.error('❌ Early vote error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}