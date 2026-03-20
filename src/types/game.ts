// src/types/game.ts
import type { Settings } from './room';

export type GameData = {
  imageKey?: string;
  locationName: string;
  theme: string | null;
  myRole: string | null;
  isSpy: boolean;
  isAlive: boolean;
  settings: Settings;
  endsAt: string;
  spyIds: string[];
  spyActionType?: 'guess' | 'kill' | null;
  /** Когда разблокируется KILL (ISO); учитывает паузы, переживает перезагрузку. */
  killUnlockAt?: string | null;
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



