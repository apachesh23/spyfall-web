// /app/page.tsx - Landing Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  function handleJoin() {
    if (!roomCode.trim()) {
      alert('Введите код комнаты');
      return;
    }
    router.push(`/invite/${roomCode.toUpperCase()}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-lg">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">🕵️ Spyfall</h1>
            <p className="mt-2 text-gray-600">Найди шпиона среди игроков</p>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/create"
              className="block w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Создать новую комнату
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">или</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Введите код комнаты"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-lg font-mono"
              />
              
              <button 
                onClick={handleJoin}
                disabled={!roomCode.trim()}
                className="block w-full px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                Присоединиться к игре
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Требуется минимум 3 игрока для начала игры
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}