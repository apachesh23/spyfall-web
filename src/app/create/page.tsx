'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgentCarousel } from '@/components/agent-carousel/AgentCarousel';
import { PlayerInputText } from '@/components/ui/PlayerInputText';
import { PrimaryButtonAuth } from '@/components/ui/PrimaryButtonAuth';
import { DEFAULT_AVATAR_ID } from '@/lib/avatars';
import { playUI } from '@/lib/sound';
import type { PlayerInput } from '@/types';
import styles from './layout.module.css';
import { useRouteLoaderStore } from '@/store/route-loader-store';

export default function CreateGamePage() {
  const router = useRouter();
  const [form, setForm] = useState<PlayerInput>({
    nickname: '',
    avatar_id: DEFAULT_AVATAR_ID,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState(false);
  const stopGlobalLoader = useRouteLoaderStore((s) => s.stop);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nickname.trim()) {
      playUI('wrong');
      setNameError(true);
      return;
    }
    setNameError(false);

    setIsCreating(true);

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: form.nickname.trim(),
          avatarId: form.avatar_id,
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

  useEffect(() => {
    // Если глобальный лоадер включён (навигация из TopBar) — держим его чуть дольше,
    // чтобы скрыть переход, затем выключаем. Локальный лоадер на этой странице не нужен.
    const t = setTimeout(() => {
      stopGlobalLoader();
    }, 800);
    return () => clearTimeout(t);
  }, [stopGlobalLoader]);

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
          disabled={isCreating}
          error={nameError}
        />
      </div>

      <PrimaryButtonAuth
        type="submit"
        layout="auth"
        disabled={isCreating}
        loading={isCreating}
        lottieIcon="/lottie/gamepad.json"
        soundClick="click"
        soundHover="hover"
      >
        {isCreating ? 'Создаём...' : 'СОЗДАТЬ КОМНАТУ'}
      </PrimaryButtonAuth>
    </form>
  );
}
