// /api/game/start/route.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// КРИТИЧНО: убрали channel.subscribe(), только БД

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
      .select('id, nickname, avatar')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (playersError || !players || players.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 players' }, { status: 400 });
    }

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

    // 5. Выбираем шпионов
    const spyCount = Math.min(settings.spy_count || 1, Math.floor(players.length / 2));
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

    // 7. Обновляем комнату - ОДНОЙ ТРАНЗАКЦИЕЙ
    const gameStartedAt = new Date();
    const durationMs = settings.game_duration * 60 * 1000;
    const gameEndsAt = new Date(gameStartedAt.getTime() + durationMs);

    console.log('⏰ Game timing:');
    console.log('  Started at:', gameStartedAt.toISOString());
    console.log('  Duration:', settings.game_duration, 'minutes');
    console.log('  Ends at:', gameEndsAt.toISOString());

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'playing', // ← КЛЮЧЕВОЕ ИЗМЕНЕНИЕ - клиенты увидят через postgres_changes
        location_id: randomLocation.id,
        selected_theme: randomTheme,
        spy_ids: spyIds,
        game_started_at: gameStartedAt.toISOString(),
        game_ends_at: gameEndsAt.toISOString(),
        updated_at: new Date().toISOString(), // ← для версионирования
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('Room update error:', updateError);
      throw updateError;
    }

    console.log('Room updated to playing');

    console.log('✅ Game started successfully');

    return NextResponse.json({ 
      success: true,
      roomCode: room.code
    });

  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}