// /app/create/page.tsx
// Страница создания игры
// Использует AvatarCarousel для выбора аватара

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarCarousel } from '@/components/avatar-carousel/AvatarCarousel';
import { AvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';

export default function CreateGamePage() {
  const router = useRouter();
  
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!nickname.trim()) {
      alert('Введите никнейм');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nickname: nickname.trim(), 
          avatarId  // ← Отправляем ID (число 1-16)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Ошибка создания комнаты');
        setIsCreating(false);
        return;
      }

      localStorage.setItem(`player_${data.roomCode}`, data.playerId);
      router.push(`/room/${data.roomCode}`);

    } catch (error) {
      console.error(error);
      alert('Ошибка создания комнаты');
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Создать новую игру
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Выбор аватара */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Выберите агента
            </label>
            <AvatarCarousel 
              selectedId={avatarId}
              onSelect={setAvatarId}
            />
          </div>

          {/* Ввод никнейма */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ваш никнейм
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Введите никнейм"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {nickname.length}/20
            </p>
          </div>

          {/* Кнопка */}
          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
          >
            {isCreating ? 'Создаём...' : 'Создать комнату'}
          </button>
        </form>
      </div>
    </div>
  );
}