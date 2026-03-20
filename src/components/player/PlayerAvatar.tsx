// /components/player/PlayerAvatar.tsx
// Аватар игрока (только id + image)
// Используется в списках игроков, карточках, везде в игре
// GPT: МОЖНО менять стили, НЕ менять использование lib/avatars

'use client';

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

  return (
    <div 
      className={`${sizeClasses[size]} relative rounded-full overflow-hidden ${className}`}
      title={avatar.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getAvatarImage(avatarId)}
        alt={avatar.name}
        className="w-full h-full object-cover block"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}