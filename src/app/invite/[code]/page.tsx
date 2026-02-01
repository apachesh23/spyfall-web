// /app/invite/[code]/page.tsx
// Присоединение к игре
// Использует AvatarCarousel (без PlayerForm)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AvatarCarousel } from '@/components/avatar-carousel/AvatarCarousel';
import { AvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingPlayer();
  }, [code]);

  async function checkExistingPlayer() {
    const playerId = localStorage.getItem(`player_${code}`);
    
    if (playerId) {
      console.log('Found playerId in localStorage:', playerId);
      
      const { data: player, error } = await supabase
        .from('players')
        .select('id, room_id')
        .eq('id', playerId)
        .single();
      
      if (player) {
        console.log('✅ Player exists, redirecting');
        router.push(`/room/${code}`);
        return;
      } else {
        console.log('❌ Player not found, clearing localStorage');
        localStorage.removeItem(`player_${code}`);
      }
    }
    
    setChecking(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('Введите никнейм');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: code, 
          nickname: nickname.trim(), 
          avatarId 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.playerId) {
        localStorage.setItem(`player_${code}`, data.playerId);
        router.push(`/room/${code}`);
      } else {
        setError(data.error || 'Ошибка присоединения');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка соединения');
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Проверка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🕵️ Присоединиться к игре
          </h1>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              Комната: <span className="font-mono font-bold text-blue-600">{code}</span>
            </p>
          </div>
        </div>

        {/* Форма */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {nickname.length}/20 символов
            </p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Присоединяемся...' : 'Присоединиться'}
          </button>
        </form>
      </div>
    </div>
  );
}