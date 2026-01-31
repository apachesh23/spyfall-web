import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomCode, nickname, avatar } = await request.json();

    if (!roomCode || !nickname || !avatar) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Игра уже началась' }, { status: 400 });
    }

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('nickname', nickname)
      .single();

    if (existingPlayer) {
      return NextResponse.json({ error: 'Ник занят' }, { status: 400 });
    }

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

    if (playerError) throw playerError;

    // НОВОЕ! Отправляем broadcast
    await supabase.channel(`room-${room.id}`).send({
      type: 'broadcast',
      event: 'player_joined',
      payload: player
    });

    return NextResponse.json({ 
      success: true,
      roomCode,
      playerId: player.id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}