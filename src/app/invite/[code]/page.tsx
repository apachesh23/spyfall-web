'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AgentCarousel } from '@/components/agent-carousel/AgentCarousel';
import { PlayerInputText } from '@/components/ui/PlayerInputText';
import { PrimaryButtonAuth } from '@/components/ui/PrimaryButtonAuth';
import { DEFAULT_AVATAR_ID } from '@/lib/avatars';
import { playUI } from '@/lib/sound';
import type { PlayerInput } from '@/types';
import styles from './layout.module.css';
import { useRouteLoaderStore } from '@/store/route-loader-store';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = use(params);
  const isPlaceholderCode = rawCode === 'null';
  const initialCode = isPlaceholderCode ? '' : rawCode.toUpperCase();

  const router = useRouter();
  const stopGlobalLoader = useRouteLoaderStore((s) => s.stop);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [form, setForm] = useState<PlayerInput>({
    nickname: '',
    avatar_id: DEFAULT_AVATAR_ID,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState(false);
  const [roomCodeError, setRoomCodeError] = useState(false);
  const [checking, setChecking] = useState(true);

  async function checkExistingPlayer(currentCode: string) {
    const playerId = localStorage.getItem(`player_${currentCode}`);

    if (playerId) {
      const { data: player } = await supabase
        .from('players')
        .select('id, room_id')
        .eq('id', playerId)
        .single();

      if (player) {
        router.push(`/room/${currentCode}`);
        return;
      }
      localStorage.removeItem(`player_${currentCode}`);
    }
    setChecking(false);
  }

  useEffect(() => {
    setRoomCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (isPlaceholderCode || !initialCode) {
      setChecking(false);
      return;
    }
    checkExistingPlayer(initialCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaceholderCode, initialCode]);

  useEffect(() => {
    if (checking) return;
    const t = setTimeout(() => {
      stopGlobalLoader();
    }, 800);
    return () => clearTimeout(t);
  }, [checking, stopGlobalLoader]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const codeToUse = roomCode.trim().toUpperCase();
    if (!codeToUse) {
      playUI('wrong');
      setRoomCodeError(true);
      return;
    }
    if (!form.nickname.trim()) {
      playUI('wrong');
      setNameError(true);
      return;
    }
    setRoomCodeError(false);
    setNameError(false);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: codeToUse,
          nickname: form.nickname.trim(),
          avatarId: form.avatar_id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.playerId) {
        localStorage.setItem(`player_${codeToUse}`, data.playerId);
        router.push(`/room/${data.roomCode}`);
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
      <p className={styles.checkingText}>Проверка...</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formWrapper}>
      <div className={styles.topBlock}>
        <AgentCarousel
          selectedId={form.avatar_id}
          onSelect={(id) => setForm((p) => ({ ...p, avatar_id: id }))}
        />
      </div>

      <div className={styles.fieldRow}>
        <PlayerInputText
          layout="auth"
          value={form.nickname}
          onChange={(nickname) => {
            setForm((p) => ({ ...p, nickname }));
            setNameError(false);
          }}
          placeholder="Ваше имя"
          maxLength={20}
          disabled={loading}
          error={nameError}
        />
      </div>

      <div className={styles.fieldRow}>
        <PlayerInputText
          layout="code"
          value={roomCode}
          onChange={(v) => {
            setRoomCode(v.toUpperCase());
            setRoomCodeError(false);
          }}
          placeholder="Код комнаты"
          maxLength={6}
          disabled={loading}
          error={roomCodeError}
        />
      </div>

      {error && (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      <PrimaryButtonAuth
        type="submit"
        layout="auth"
        disabled={loading}
        loading={loading}
        lottieIcon="/lottie/key.json"
        soundClick="click"
        soundHover="hover"
      >
        {loading ? 'Присоединяемся...' : 'ПРИСОЕДИНИТЬСЯ'}
      </PrimaryButtonAuth>
    </form>
  );
}
