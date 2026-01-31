'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerForm } from '@/components/player/PlayerForm';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createGame(nickname: string, avatar: string) {
    setLoading(true);

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar }),
      });

      const data = await response.json();

      if (data.roomCode && data.playerId) {
        localStorage.setItem(`player_${data.roomCode}`, data.playerId);
        router.push(`/room/${data.roomCode}`);
      } else {
        alert('Ошибка создания комнаты');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения');
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>🕵️ SpyFall Game</h1>
      
      <PlayerForm 
        onSubmit={createGame}
        buttonText="Создать игру"
        loading={loading}
      />
    </div>
  );
}