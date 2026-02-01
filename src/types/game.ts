// src/types/game.ts
import type { Settings } from './room';

export type GameData = {
  locationName: string;
  theme: string | null;
  myRole: string | null;
  isSpy: boolean;
  isAlive: boolean;
  settings: Settings;
  endsAt: string;
  spyIds: string[];
};

export type VoteResult = {
  player_id: string;
  votes: number;
  is_spy: boolean;
};

export type Location = {
  id: string;
  name: string;
  roles: string[];
  themes?: string[];
};



