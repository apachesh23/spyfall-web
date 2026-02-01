// src/types/player.ts
import type { AvatarId } from '@/lib/avatars';

export type Player = {
  id: string;
  nickname: string;
  avatar_id: AvatarId;
  is_host: boolean;
  room_id: string;
  joined_at: string;
};
