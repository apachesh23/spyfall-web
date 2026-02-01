// /api/rooms/join/route.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// Изменения: убрали broadcast, добавили больше проверок

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomCode, nickname, avatar } = await request.json();

    if (!roomCode || !nickname || !avatar) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Валидация
    if (nickname.length > 20) {
      return NextResponse.json({ error: 'Nickname too long' }, { status: 400 });
    }

    // 1. Находим комнату
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, settings')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    // 2. Проверяем статус
    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Игра уже началась' }, { status: 400 });
    }

    // 3. Проверяем лимит игроков (если есть max_players)
    const { count: playerCount } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id);

    const maxPlayers = room.settings?.max_players || 8;
    if (playerCount && playerCount >= maxPlayers) {
      return NextResponse.json({ error: 'Комната заполнена' }, { status: 400 });
    }

    // 4. Проверяем уникальность ника
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('nickname', nickname)
      .maybeSingle(); // ← используем maybeSingle вместо single

    if (existingPlayer) {
      return NextResponse.json({ error: 'Ник занят в этой комнате' }, { status: 400 });
    }

    // 5. Создаём игрока
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        nickname,
        avatar,
        is_host: false,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Player creation error:', playerError);
      throw playerError;
    }

    console.log('✅ Player joined:', player.nickname, 'to room:', roomCode);

    return NextResponse.json({ 
      success: true,
      roomCode,
      roomId: room.id,
      playerId: player.id
    });

  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}