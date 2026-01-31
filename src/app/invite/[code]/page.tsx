'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PlayerForm } from '@/components/player/PlayerForm';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  
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
      
      console.log('Player check:', { player, error });
      
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

  async function joinGame(nickname: string, avatar: string) {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: code, 
          nickname, 
          avatar 
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

  if (checking) return <div style={{ padding: '20px' }}>Проверка...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>🕵️ SpyFall Game</h1>
      
      <div style={{ 
        background: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px' 
      }}>
        <p style={{ margin: 0, fontSize: '16px' }}>
          Присоединение к комнате: <strong>{code}</strong>
        </p>
      </div>

      <PlayerForm 
        onSubmit={joinGame}
        buttonText="Присоединиться"
        loading={loading}
        error={error}
      />
    </div>
  );
}