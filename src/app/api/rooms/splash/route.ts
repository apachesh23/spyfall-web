// POST /api/rooms/splash — показать баннер всем в комнате (только хост)
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const ALLOWED_TYPES = [
  'system_start',
  'system_pause',
  'game_over_spy_win',
  'game_over_civilians_win',
  'spy_kill',
  'voting_kicked_civilian',
  'voting',
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, hostId, type, countdownSeconds, countdownLabel } = body;

    if (!roomId || !hostId || !type) {
      return NextResponse.json(
        { error: 'roomId, hostId и type обязательны' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Недопустимый type' }, { status: 400 });
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, host_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    if (room.host_id !== hostId) {
      return NextResponse.json(
        { error: 'Только ведущий может показывать баннер' },
        { status: 403 }
      );
    }

    // Для типов с таймером всегда пишем countdownSeconds (дефолт, если не передан), чтобы все клиенты получали одно значение
    const countdownTypes: Record<string, number> = {
      system_start: 5,
      voting_kicked_civilian: 10,
      spy_kill: 10,
      voting: 300,
    };
    const resolvedCountdown =
      countdownSeconds != null ? Number(countdownSeconds) : countdownTypes[type];
    const now = Date.now();
    const splash_event = {
      type,
      ...(resolvedCountdown != null && { countdownSeconds: resolvedCountdown }),
      ...(countdownLabel != null && { countdownLabel: String(countdownLabel) }),
      at: new Date(now).toISOString(),
      ...(resolvedCountdown != null && {
        ends_at: new Date(now + resolvedCountdown * 1000).toISOString(),
      }),
    };

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        splash_event,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('Splash update error:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить комнату' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, splash_event });
  } catch (e) {
    console.error('Splash API error:', e);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
