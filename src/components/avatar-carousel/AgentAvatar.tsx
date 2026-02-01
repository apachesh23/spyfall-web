// /components/avatar-carousel/AgentAvatar.tsx
// Один аватар в карусели (стиль/визуал)
// GPT: МОЖНО менять стили, НЕ менять логику

'use client';

import Image from 'next/image';
import { AgentAvatar as Avatar } from '@/lib/avatars';

type AgentAvatarProps = {
  avatar: Avatar;
  isSelected: boolean;
  onSelect: () => void;
};

export function AgentAvatar({ avatar, isSelected, onSelect }: AgentAvatarProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative w-16 h-16 rounded-full overflow-hidden
        transition-all duration-200
        ${isSelected 
          ? 'ring-4 ring-blue-500 scale-110' 
          : 'ring-2 ring-gray-300 hover:ring-blue-400 hover:scale-105'
        }
      `}
      title={avatar.name}
    >
      <Image
        src={avatar.image}
        alt={avatar.name}
        fill
        sizes="64px"
        className="object-cover"
      />
    </button>
  );
}