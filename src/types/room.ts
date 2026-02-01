// src/types/room.ts

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type Settings = {
  spy_count: number;
  game_duration: number;
  vote_duration: number;
  mode_roles: boolean;
  mode_theme: boolean;
  mode_spy_chaos: boolean;
  mode_hidden_threat: boolean;
  mode_shadow_alliance: boolean;
  max_players?: number;
};

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: Settings;
  location_id?: string;
  selected_theme?: string | null;
  spy_ids?: string[];
  game_started_at?: string;
  game_ends_at?: string;
  created_at: string;
  updated_at: string;
};