import type { Settings } from '@/types';

/**
 * Приводит сырой объект настроек из БД к типу Settings.
 * Игнорирует устаревшие поля (mode_shadow_alliance), задаёт дефолты, сохраняет max_players.
 */
export function normalizeRoomSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    game_duration: typeof s.game_duration === 'number' ? s.game_duration : 15,
    vote_duration: typeof s.vote_duration === 'number' ? s.vote_duration : 1,
    spy_count: typeof s.spy_count === 'number' ? Math.max(1, Math.min(3, s.spy_count)) : 1,
    mode_roles: !!s.mode_roles,
    mode_theme: !!s.mode_theme,
    mode_multi_spy: !!s.mode_multi_spy,
    mode_spy_chaos: !!s.mode_spy_chaos,
    mode_hidden_threat: !!s.mode_hidden_threat,
    max_players: typeof s.max_players === 'number' ? Math.max(3, Math.min(20, s.max_players)) : undefined,
  };
}
