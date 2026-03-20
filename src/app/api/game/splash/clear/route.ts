import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/** Сброс splash_event у текущей игры (после просмотра spy_kill и т.д.). */
export async function POST(request: Request) {
  try {
    const { roomId } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('current_game_id')
      .eq('id', roomId)
      .single();

    if (!room?.current_game_id) {
      return NextResponse.json({ success: true });
    }

    await supabase
      .from('games')
      .update({ splash_event: null, updated_at: new Date().toISOString() })
      .eq('id', room.current_game_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Splash clear error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
