// POST /api/rooms/splash/dismiss — снять баннер (хост всегда; system_start может снять любой после окончания таймера)
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, playerId } = body;

    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: 'roomId и playerId обязательны' },
        { status: 400 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id, splash_event')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    const isHost = room.host_id === playerId;
    const eventType = room.splash_event?.type;

    if (!eventType) {
      return NextResponse.json({ success: true, skipped: 'no_active_splash' });
    }

    // Для not-host разрешаем снимать только system_start и только после окончания таймера.
    if (!isHost) {
      if (eventType !== 'system_start') {
        return NextResponse.json(
          { error: 'Только ведущий может снять этот баннер' },
          { status: 403 }
        );
      }

      const ev = room.splash_event as {
        at?: string;
        ends_at?: string;
        countdownSeconds?: number;
      } | null;
      const endsAtMs = ev?.ends_at
        ? new Date(ev.ends_at).getTime()
        : ev?.at
          ? new Date(ev.at).getTime() + (Number(ev.countdownSeconds ?? 5) * 1000)
          : Number.POSITIVE_INFINITY;

      if (Date.now() < endsAtMs) {
        return NextResponse.json(
          { error: 'Слишком рано снимать стартовый баннер' },
          { status: 403 }
        );
      }
    }

    // Проверяем, что playerId есть в комнате (игрок в players с этим room_id)
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('id', playerId)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: 'Игрок не в этой комнате' },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        splash_event: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('Splash dismiss error:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить комнату' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Splash dismiss API error:', e);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
