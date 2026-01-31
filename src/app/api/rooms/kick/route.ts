import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { playerId, roomId, kickerId } = await request.json();

    console.log('Kick request:', { playerId, roomId, kickerId });

    if (!playerId || !roomId || !kickerId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Проверяем что кикает ведущий
    const { data: kicker, error: kickerError } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', kickerId)
      .single();

    console.log('Kicker check:', { kicker, kickerError });

    if (kickerError || !kicker?.is_host) {
      return NextResponse.json({ error: 'Только ведущий может кикать' }, { status: 403 });
    }

    // Удаляем игрока из БД
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    console.log('Delete result:', { deleteError });

    if (deleteError) {
      throw deleteError;
    }

    // ИСПРАВЛЕНО! Правильная отправка broadcast
    const channel = supabase.channel(`room-${roomId}`);
    
    // Сначала подписываемся
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        }
      });
    });

    // Потом отправляем
    await channel.send({
      type: 'broadcast',
      event: 'player_kicked',
      payload: { playerId }
    });

    console.log('✅ Broadcast sent');

    // Отписываемся
    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Kick error:', error);
    return NextResponse.json({ error: 'Failed to kick' }, { status: 500 });
  }
}