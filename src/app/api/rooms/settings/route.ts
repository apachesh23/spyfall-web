import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { roomId, hostId, settings } = await request.json();

    console.log('Update settings:', { roomId, hostId, settings });

    if (!roomId || !hostId || !settings) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Проверяем что обновляет ведущий
    const { data: host } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', hostId)
      .eq('room_id', roomId)
      .single();

    if (!host?.is_host) {
      return NextResponse.json({ error: 'Только ведущий может менять настройки' }, { status: 403 });
    }

    // Валидация
    const validated = validateSettings(settings);
    if (!validated.valid) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    // Обновляем настройки
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ settings: validated.settings })
      .eq('id', roomId);

    if (updateError) throw updateError;

    // Broadcast всем игрокам
    const channel = supabase.channel(`room-${roomId}`);
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
      });
    });

    await channel.send({
      type: 'broadcast',
      event: 'settings_updated',
      payload: validated.settings
    });

    await supabase.removeChannel(channel);

    return NextResponse.json({ success: true, settings: validated.settings });

  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

function validateSettings(settings: any) {
  const s = {
    game_duration: Number(settings.game_duration) || 15,
    vote_duration: Number(settings.vote_duration) || 1,
    spy_count: Number(settings.spy_count) || 1,
    mode_roles: Boolean(settings.mode_roles),
    mode_theme: Boolean(settings.mode_theme),
    mode_hidden_threat: Boolean(settings.mode_hidden_threat),
    mode_shadow_alliance: Boolean(settings.mode_shadow_alliance),
    mode_spy_chaos: Boolean(settings.mode_spy_chaos),
  };

  // Валидация
  if (s.game_duration < 1 || s.game_duration > 60) {
    return { valid: false, error: 'Время игры: 1-60 минут' };
  }

  if (s.vote_duration < 0.5 || s.vote_duration > 5) {
    return { valid: false, error: 'Время голосования: 0.5-5 минут' };
  }

  if (s.spy_count < 1 || s.spy_count > 10) {
    return { valid: false, error: 'Шпионов: 1-10' };
  }

  // Режим "Шпионский хаос" отключает ручной выбор кол-ва шпионов
  if (s.mode_spy_chaos) {
    s.spy_count = 1; // Игнорируем, будет рандом
  }

  // Режим "Союз теней" работает только если шпионов > 1
  if (s.mode_shadow_alliance && s.spy_count < 2 && !s.mode_spy_chaos) {
    return { valid: false, error: '"Союз теней" требует минимум 2 шпионов' };
  }

  return { valid: true, settings: s };
}