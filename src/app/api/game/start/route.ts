import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    console.log('🎮 Start game:', { roomId, hostId });

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Проверяем что стартует ведущий
    const { data: host } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', hostId)
      .eq('room_id', roomId)
      .single();

    if (!host?.is_host) {
      return NextResponse.json({ error: 'Только ведущий может запустить игру' }, { status: 403 });
    }

    // 2. Получаем комнату и игроков
    const { data: room } = await supabase
      .from('rooms')
      .select('code, settings')
      .eq('id', roomId)
      .single();

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (!room || !players || players.length < 3) {
      return NextResponse.json({ error: 'Минимум 3 игрока для старта' }, { status: 400 });
    }

    console.log('Players:', players.length);

    // 3. Получаем все локации
    const { data: locations } = await supabase
      .from('locations')
      .select('*');

    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: 'Нет локаций в базе' }, { status: 500 });
    }

    // 4. Выбираем случайную локацию
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    console.log('Selected location:', randomLocation.name);

    // 5. Выбираем случайную тему
    const randomTheme = randomLocation.themes[Math.floor(Math.random() * randomLocation.themes.length)];
    console.log('Selected theme:', randomTheme);

    // 6. Назначаем шпионов
    const settings = room.settings;
    let spyCount = settings.spy_count;

    // Режим "Шпионский хаос" - рандомное кол-во
    if (settings.mode_spy_chaos) {
      const maxSpies = Math.floor(players.length / 2);
      spyCount = Math.floor(Math.random() * maxSpies) + 1; // От 1 до 50%
      console.log('Spy chaos mode: generated', spyCount, 'spies');
    }

    // Перемешиваем игроков и выбираем шпионов
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const spies = shuffledPlayers.slice(0, spyCount);
    const spyIds = spies.map(s => s.id);

    console.log('Spies:', spyIds);

    // 7. Раздаём роли (если режим включён)
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

    // 8. Обновляем комнату
    const gameStartedAt = new Date();
    const durationMs = settings.game_duration * 60 * 1000;
    const gameEndsAt = new Date(gameStartedAt.getTime() + durationMs);

    console.log('⏰ Game timing:');
    console.log('  Started at:', gameStartedAt.toISOString());
    console.log('  Duration:', settings.game_duration, 'minutes');
    console.log('  Ends at:', gameEndsAt.toISOString());
    console.log('  Duration ms:', durationMs);

    await supabase
      .from('rooms')
      .update({
        status: 'playing',
        location_id: randomLocation.id,
        selected_theme: randomTheme,
        spy_ids: spyIds,
        game_started_at: gameStartedAt.toISOString(), // ← уже с Z
        game_ends_at: gameEndsAt.toISOString()        // ← уже с Z
      })
      .eq('id', roomId);

    console.log('Room updated');

    // 9. Отправляем broadcast
    const channel = supabase.channel(`room-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'game_started',
      payload: { roomCode: room.code }
    });

    await supabase.removeChannel(channel);

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