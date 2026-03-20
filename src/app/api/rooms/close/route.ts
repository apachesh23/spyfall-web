// /api/rooms/close/route.ts — закрытие и удаление комнаты (только хост)
// В Supabase на таблицах players/votes уже настроен ON DELETE CASCADE по room_id,
// поэтому достаточно удалить комнату — связанные игроки и голоса удалятся автоматически.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId } = await request.json();

    if (!roomId || !hostId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id, code')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== hostId) {
      return NextResponse.json({ error: 'Only host can close the room' }, { status: 403 });
    }

    console.log('🚪 Closing room:', room.code);

    const { error: roomErr } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (roomErr) {
      console.error('Room delete error:', roomErr);
      throw roomErr;
    }

    console.log('✅ Room closed and deleted:', room.code);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Close room error:', error);
    return NextResponse.json({ error: 'Failed to close room' }, { status: 500 });
  }
}
