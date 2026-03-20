// src/types/room.ts

export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** Событие баннера в комнате (показ всем через realtime) */
export type SplashEventPayload = {
  type: string;
  countdownSeconds?: number;
  countdownLabel?: string;
  at: string; // ISO timestamp
  ends_at?: string; // ISO timestamp (server authoritative end time)
};

export type Settings = {
  spy_count: number; // 1 | 2 | 3 — фиксированное или макс. при хаосе
  game_duration: number;
  vote_duration: number;
  mode_roles: boolean;
  mode_theme: boolean;
  mode_multi_spy: boolean; // Сеть шпионов: 7–10 → 2 шпиона, 11+ → 3
  mode_spy_chaos: boolean; // только при mode_multi_spy: случайно 1..spy_count
  mode_hidden_threat: boolean; // только при 1 шпионе (без multi spy)
  max_players?: number;
};

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: Settings;
  splash_event?: SplashEventPayload | null;
  location_id?: string;
  selected_theme?: string | null;
  spy_ids?: string[];
  game_started_at?: string;
  game_ends_at?: string;
  created_at: string;
  updated_at: string;
};