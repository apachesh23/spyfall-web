// /components/avatar-carousel/AvatarCarousel.tsx
// Карусель всех 16 аватаров для выбора
// GPT: МОЖНО менять стили/layout, НЕ менять логику выбора

'use client';

import { AVATAR_LIST, AvatarId, getAvatar } from '@/lib/avatars';
import { AgentAvatar } from './AgentAvatar';
import Image from 'next/image';

type AvatarCarouselProps = {
  selectedId: AvatarId;
  onSelect: (id: AvatarId) => void;
};

export function AvatarCarousel({ selectedId, onSelect }: AvatarCarouselProps) {
  const selected = getAvatar(selectedId);

  return (
    <div className="space-y-6">
      {/* Выбранный аватар (крупно) */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-blue-500">
          <Image
            src={selected.image}
            alt={selected.name}
            fill
            sizes="96px"
            className="object-cover"
            priority
          />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">{selected.name}</h3>
          {selected.description && (
            <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
          )}
        </div>
      </div>

      {/* Сетка всех аватаров (4x4) */}
      <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
        {AVATAR_LIST.map((avatar) => (
          <AgentAvatar
            key={avatar.id}
            avatar={avatar}
            isSelected={avatar.id === selectedId}
            onSelect={() => onSelect(avatar.id)}
          />
        ))}
      </div>
    </div>
  );
}