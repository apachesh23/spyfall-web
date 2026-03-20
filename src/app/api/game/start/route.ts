// /api/game/start/route.ts - ИСПРАВЛЕНО для avatar_id

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    console.log('🎮 Starting game for room:', roomId);

    // 1. Проверяем что это хост
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('code, host_id, status, settings')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== hostId) {
      return NextResponse.json({ error: 'Only host can start game' }, { status: 403 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // 2. Проверяем количество игроков
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname, avatar_id') // ← ИСПРАВЛЕНО: было avatar
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (playersError) {
      console.error('Players load error:', playersError);
      return NextResponse.json({ error: 'Failed to load players' }, { status: 500 });
    }

    if (!players || players.length < 3) {
      console.log('Not enough players:', players?.length);
      return NextResponse.json({ error: 'Need at least 3 players' }, { status: 400 });
    }

    console.log('✅ Players loaded:', players.length);

    const settings = room.settings || {};

    // 3. Выбираем случайную локацию
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, roles, themes');

    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: 'No locations available' }, { status: 500 });
    }

    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    // 4. Выбираем случайную тему
    let randomTheme = null;
    if (settings.mode_theme && randomLocation.themes?.length > 0) {
      randomTheme = randomLocation.themes[Math.floor(Math.random() * randomLocation.themes.length)];
    }

    // 5. Выбираем шпионов (при режиме «Шпионский хаос» — случайно от 1 до max)
    const maxSpyCount = Math.min(settings.spy_count || 1, Math.floor(players.length / 2));
    const spyCount = settings.mode_spy_chaos
      ? 1 + Math.floor(Math.random() * maxSpyCount) // 1..maxSpyCount включительно
      : maxSpyCount;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const spyIds = shuffled.slice(0, spyCount).map(p => p.id);

    console.log('Spies:', spyIds);

    // 6. Раздаём роли
    const shuffledRoles = [...randomLocation.roles].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const isSpy = spyIds.includes(player.id);
      const role = settings.mode_roles 
        ? shuffledRoles[i % shuffledRoles.length] 
        : null;

      await supabase
        .from('players')
        .update({
          is_spy: isSpy,
          role: role,
          is_alive: true
        })
        .eq('id', player.id);
    }

    console.log('Roles assigned');

    // 7. Создаём запись в games и обновляем комнату (status + current_game_id)
    const gameStartedAt = new Date();
    const durationMs = (settings.game_duration || 15) * 60 * 1000;
    const gameEndsAt = new Date(gameStartedAt.getTime() + durationMs);

    console.log('⏰ Game timing:');
    console.log('  Started at:', gameStartedAt.toISOString());
    console.log('  Duration:', settings.game_duration || 15, 'minutes');
    console.log('  Ends at:', gameEndsAt.toISOString());

    const killUnlockAt = settings.mode_hidden_threat
      ? new Date(gameStartedAt.getTime() + 3 * 60 * 1000).toISOString()
      : null;

    // TODO DEBUG: 10 сек для теста; вернуть 3 * 60 * 1000 для продакшена
    const earlyVoteCooldownMs = 10 * 1000;
    const earlyVoteAvailableAt = new Date(gameStartedAt.getTime() + earlyVoteCooldownMs).toISOString();

    const { data: newGame, error: gameInsertError } = await supabase
      .from('games')
      .insert({
        room_id: roomId,
        location_id: randomLocation.id,
        selected_theme: randomTheme,
        spy_ids: spyIds,
        started_at: gameStartedAt.toISOString(),
        ends_at: gameEndsAt.toISOString(),
        voting_status: 'none',
        voting_round: 1,
        phase: 'playing',
        kill_unlock_at: killUnlockAt,
        early_vote_used_count: 0,
        early_vote_available_at: earlyVoteAvailableAt,
      })
      .select('id')
      .single();

    if (gameInsertError || !newGame) {
      console.error('Game insert error:', gameInsertError);
      throw gameInsertError || new Error('Failed to create game');
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_game_id: newGame.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('Room update error:', updateError);
      throw updateError;
    }

    console.log('✅ Game started successfully, gameId:', newGame.id);

    return NextResponse.json({ 
      success: true,
      roomCode: room.code
    });

  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}