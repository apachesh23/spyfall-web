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

    const roomCode = generateRoomCode();
    const hostId = crypto.randomUUID();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: hostId,
        status: 'waiting',
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        nickname,
        avatar,
        is_host: true,
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
      roomCode: room.code,
      roomId: room.id,
      playerId: player.id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}