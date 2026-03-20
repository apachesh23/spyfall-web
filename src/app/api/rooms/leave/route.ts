// /api/rooms/leave/route.ts — самовыход игрока из комнаты
// По сути то же действие, что и кик (удаление из players), но инициатор — сам игрок

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, playerId } = await request.json();

    if (!roomId || !playerId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: player } = await supabase
      .from('players')
      .select('id, nickname, room_id')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not in this room' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (deleteError) {
      console.error('Leave room error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Player left:', player.nickname, 'from room:', roomId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave room error:', error);
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 });
  }
}
