// /api/rooms/create/route.ts - ОБНОВЛЕНО для avatar_id

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { isValidAvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';

function generateRoomCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const { nickname, avatarId } = await request.json(); // ← ИЗМЕНЕНО: avatar → avatarId

    if (!nickname || avatarId === undefined) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Валидация
    if (nickname.length > 20) {
      return NextResponse.json({ error: 'Nickname too long' }, { status: 400 });
    }

    // Валидация avatar_id
    if (!isValidAvatarId(avatarId)) {
      console.warn('Invalid avatar_id:', avatarId, '- using default');
      // Можно либо вернуть ошибку, либо использовать default
      // return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });
    }

    let roomCode = '';
    const hostId = crypto.randomUUID();

    const initialSettings = {
      spy_count: 1,
      game_duration: 15,
      vote_duration: 1,
      mode_roles: false,
      mode_theme: false,
      mode_multi_spy: false,
      mode_spy_chaos: false,
      mode_hidden_threat: false,
      max_players: 20,
    };

    // 1. Создаём комнату (6-значный цифровой код) с ретраями на случай коллизий
    let room: { id: string; code: string } | null = null;
    let roomError: unknown = null;
    const maxAttempts = 12;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      roomCode = generateRoomCode();
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          host_id: hostId,
          status: 'waiting',
          settings: initialSettings,
        })
        .select('id, code')
        .single();

      if (!error && data) {
        room = data;
        roomError = null;
        break;
      }
      roomError = error;
    }

    if (roomError || !room) {
      console.error('Room creation error:', roomError);
      throw roomError || new Error('Failed to generate unique room code');
    }

    // 2. Создаём игрока-хоста
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: hostId,
        room_id: room.id,
        nickname,
        avatar_id: isValidAvatarId(avatarId) ? avatarId : DEFAULT_AVATAR_ID, // ← ИЗМЕНЕНО
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