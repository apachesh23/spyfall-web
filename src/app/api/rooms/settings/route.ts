// /api/rooms/settings/route.ts - УЛУЧШЕННАЯ ВЕРСИЯ
// Изменения: убрали broadcast, добавили версионирование

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { Settings } from '@/types';

export async function POST(request: Request) {
  try {
    const { roomId, hostId, settings } = await request.json();

    if (!roomId || !hostId || !settings) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Проверяем что это хост и загружаем текущие settings для слияния
    const { data: room } = await supabase
      .from('rooms')
      .select('host_id, status, settings')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== hostId) {
      return NextResponse.json({ error: 'Only host can change settings' }, { status: 403 });
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot change settings during game' }, { status: 400 });
    }

    const current = (room.settings || {}) as Record<string, unknown>;

    // 2. Валидация настроек. max_players берём из запроса или из текущих (не затираем значением по умолчанию).
    const validatedSettings: Settings = {
      spy_count: Math.max(1, Math.min(settings.spy_count ?? (current.spy_count as number) ?? 1, 3)),
      game_duration: Math.max(5, Math.min(settings.game_duration ?? (current.game_duration as number) ?? 15, 30)),
      vote_duration: Math.max(1, Math.min(settings.vote_duration ?? (current.vote_duration as number) ?? 1, 5)),
      mode_roles: !!settings.mode_roles,
      mode_theme: !!settings.mode_theme,
      mode_multi_spy: !!settings.mode_multi_spy,
      mode_spy_chaos: !!settings.mode_spy_chaos,
      mode_hidden_threat: !!settings.mode_hidden_threat,
      max_players: Math.max(3, Math.min(
        (settings.max_players ?? current.max_players ?? 8) as number,
        20,
      )),
    };

    // 3. Обновляем настройки + updated_at для версионирования
    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update({
        settings: validatedSettings,
        updated_at: new Date().toISOString(), // ← ВАЖНО для версионирования
      })
      .eq('id', roomId)
      .select('settings')
      .single();

    if (updateError) {
      console.error('Settings update error:', updateError);
      throw updateError;
    }

    console.log('✅ Settings updated for room:', roomId);

    return NextResponse.json({ 
      success: true,
      settings: updatedRoom.settings
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}