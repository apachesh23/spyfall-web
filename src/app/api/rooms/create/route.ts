// /api/rooms/create/route.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// Изменения: убрали broadcast (не нужен), добавили транзакционность

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const { nickname, avatar } = await request.json();

    if (!nickname || !avatar) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Валидация
    if (nickname.length > 20) {
      return NextResponse.json({ error: 'Nickname too long' }, { status: 400 });
    }

    const roomCode = generateRoomCode();
    const hostId = crypto.randomUUID();

    // 1. Создаём комнату
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: hostId,
        status: 'waiting',
        // settings используется default из БД
      })
      .select()
      .single();

    if (roomError) {
      console.error('Room creation error:', roomError);
      throw roomError;
    }

    // 2. Создаём игрока-хоста
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: hostId, // ВАЖНО: используем тот же ID что host_id
        room_id: room.id,
        nickname,
        avatar,
        is_host: true,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Player creation error:', playerError);
      // Откатываем комнату
      await supabase.from('rooms').delete().eq('id', room.id);
      throw playerError;
    }

    console.log('✅ Room created:', roomCode, 'Host:', hostId);

    return NextResponse.json({ 
      roomCode: room.code,
      roomId: room.id,
      playerId: player.id
    });

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}