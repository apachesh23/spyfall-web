import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';

function genShareHash(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: host } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', hostId)
      .eq('room_id', roomId)
      .single();

    if (!host?.is_host) {
      return NextResponse.json({ error: 'Только ведущий может завершить игру' }, { status: 403 });
    }

    console.log('🏁 Ending game for room:', roomId);

    const { data: room } = await supabase
      .from('rooms')
      .select('id, code, current_game_id, settings')
      .eq('id', roomId)
      .single();

    const gameId = room?.current_game_id;
    let shareHash: string | null = null;

    if (gameId) {
      const { data: game } = await supabase
        .from('games')
        .select('id, location_id, selected_theme, spy_ids, started_at, splash_event')
        .eq('id', gameId)
        .single();

      const { data: players } = await supabase
        .from('players')
        .select('id, nickname, avatar_id, is_spy, is_alive, death_reason, role')
        .eq('room_id', roomId);

      const { data: location } =
        game?.location_id
          ? await supabase.from('locations').select('name').eq('id', game.location_id).single()
          : { data: null };

      const splashEv = game?.splash_event as { winner?: string } | null;
      const winner = splashEv?.winner ?? null;

      const startedAtMs = game?.started_at ? new Date(game.started_at).getTime() : null;
      const { data: eventsRaw } =
        game?.id
          ? await supabaseAdmin
              .from('game_events')
              .select('created_at, type, payload')
              .eq('game_id', game.id)
              .order('created_at', { ascending: true })
          : { data: null };

      const events =
        (eventsRaw ?? []).map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ev: { created_at: string; type: string; payload: any }) => {
          const at = ev.created_at;
          const payload = ev.payload ?? {};
          const tRaw =
            typeof payload.game_time_sec === 'number'
              ? payload.game_time_sec
              : startedAtMs != null
                ? Math.max(0, Math.floor((new Date(at).getTime() - startedAtMs) / 1000))
                : null;
          return {
            at,
            t: tRaw,
            type: ev.type,
            data: payload,
          };
        });

      // Время операции считаем по игровому таймеру:
      // - при победе шпиона/агентов: момент финального события (но не больше длительности таймера);
      // - при игре до конца таймера: ровно полная длительность.
      let endedAtIso: string | null = null;
      const baseDurationSec =
        room?.settings && typeof room.settings.game_duration === 'number'
          ? room.settings.game_duration * 60
          : null;
      const tValues = events
        .map((e) => (typeof e.t === 'number' ? e.t : null))
        .filter((v) => v != null) as number[];
      const maxT = tValues.length > 0 ? Math.max(...tValues) : null;

      const decisiveTs = events
        .filter((ev) => {
          const d = ev.data ?? {};
          if (ev.type === 'spy_guess_result' && d.accepted === true) return true;
          if (ev.type === 'vote_result') {
            const res = d.result ?? {};
            return res.isFinal === true || d.is_final_voting === true;
          }
          return false;
        })
        .map((ev) => (typeof ev.t === 'number' ? ev.t : null))
        .filter((v) => v != null) as number[];

      let opSec: number | null = null;
      if (decisiveTs.length > 0) {
        const decisT = Math.max(...decisiveTs);
        if (baseDurationSec != null) {
          opSec = Math.min(baseDurationSec, decisT);
        } else {
          opSec = decisT;
        }
      } else if (baseDurationSec != null) {
        opSec = baseDurationSec;
      } else if (maxT != null) {
        opSec = maxT;
      }

      if (startedAtMs != null && opSec != null) {
        endedAtIso = new Date(startedAtMs + opSec * 1000).toISOString();
      } else {
        endedAtIso = new Date().toISOString();
      }

      const payload = {
        players: (players ?? []).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar_id: p.avatar_id,
          is_spy: p.is_spy,
          is_alive: p.is_alive,
          death_reason: p.death_reason,
          role: p.role ?? null,
        })),
        voting_rounds: [],
        spy_actions: [],
        events,
      };

      shareHash = genShareHash();
      const { error: histErr } = await supabaseAdmin.from('game_history').insert({
        share_hash: shareHash,
        room_id: roomId,
        game_id: gameId,
        location_id: game?.location_id ?? null,
        location_name: location?.name ?? null,
        theme: game?.selected_theme ?? null,
        spy_ids: game?.spy_ids ?? [],
        winner,
        started_at: game?.started_at ?? null,
        ended_at: endedAtIso,
        payload,
      });

      if (histErr) {
        console.error('Game history insert error:', histErr);
        shareHash = null;
      }

      await supabaseAdmin.from('hint_question_usages').delete().eq('game_id', gameId);
    }

    // Сначала broadcast — иначе postgres_changes от сброса комнаты вызовет редирект в лобби до получения broadcast
    const channel = supabase.channel(`room-${roomId}`);
    const subscribeTimeoutMs = 8000;
    try {
      await Promise.race([
        new Promise<void>((resolve) => {
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') resolve();
          });
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Channel subscribe timeout')), subscribeTimeoutMs)
        ),
      ]);
      await channel.send({
        type: 'broadcast',
        event: 'game_ended',
        payload: { roomCode: room?.code, shareHash: shareHash ?? undefined },
      });
    } catch (e) {
      console.warn('End game: broadcast skipped (timeout or error)', e);
    } finally {
      await supabase.removeChannel(channel);
    }

    await supabase
      .from('rooms')
      .update({ status: 'waiting', current_game_id: null, updated_at: new Date().toISOString() })
      .eq('id', roomId);

    await supabase
      .from('players')
      .update({
        is_spy: false,
        role: null,
        is_alive: true,
        wants_early_vote: false,
      })
      .eq('room_id', roomId);

    await supabase.from('votes').delete().eq('room_id', roomId);

    console.log('✅ Game reset to waiting state');

    return NextResponse.json({
      success: true,
      shareHash: shareHash ?? undefined,
      roomCode: room?.code ?? undefined,
    });
  } catch (error) {
    console.error('End game error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}