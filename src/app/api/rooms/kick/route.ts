// /api/rooms/kick/route.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// Изменения: убрали broadcast, добавили проверки

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { playerId, roomId, kickerId } = await request.json();

    if (!playerId || !roomId || !kickerId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Проверяем что kicker это хост
    const { data: room } = await supabase
      .from('rooms')
      .select('host_id, status')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== kickerId) {
      return NextResponse.json({ error: 'Only host can kick players' }, { status: 403 });
    }

    // 2. Нельзя кикнуть себя
    if (playerId === kickerId) {
      return NextResponse.json({ error: 'Cannot kick yourself' }, { status: 400 });
    }

    // 3. Проверяем что игрок существует в комнате
    const { data: player } = await supabase
      .from('players')
      .select('id, nickname')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found in this room' }, { status: 404 });
    }

    // 4. Удаляем игрока
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (deleteError) {
      console.error('Player delete error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Player kicked:', player.nickname, 'from room:', roomId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Kick player error:', error);
    return NextResponse.json({ error: 'Failed to kick player' }, { status: 500 });
  }
}