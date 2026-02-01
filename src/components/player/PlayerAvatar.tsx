// /components/player/PlayerAvatar.tsx
// Аватар игрока (только id + image)
// Используется в списках игроков, карточках, везде в игре
// GPT: МОЖНО менять стили, НЕ менять использование lib/avatars

'use client';

import Image from 'next/image';
import { AvatarId, getAvatarImage, getAvatar } from '@/lib/avatars';

type PlayerAvatarProps = {
  avatarId: AvatarId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function PlayerAvatar({ avatarId, size = 'md', className = '' }: PlayerAvatarProps) {
  const avatar = getAvatar(avatarId);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const sizePx = {
    sm: '32px',
    md: '48px',
    lg: '64px',
  };

  return (
    <div 
      className={`${sizeClasses[size]} relative rounded-full overflow-hidden ${className}`}
      title={avatar.name}
    >
      <Image
        src={getAvatarImage(avatarId)}
        alt={avatar.name}
        fill
        sizes={sizePx[size]}
        className="object-cover"
      />
    </div>
  );
}