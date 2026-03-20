'use client';

import { AnimatePresence } from 'framer-motion';
import { SplashScreen } from '@/components/ui/SplashScreen';
import type { SplashType } from '@/components/ui/SplashScreen';
import { VotingSplash } from '@/components/game';
import { playVFX } from '@/lib/sound';
import type { SplashEventPayload } from '@/types';
import type { AvatarId } from '@/lib/avatars';

type VictorySplashType =
  | 'game_over_spy_win'
  | 'game_over_civilians_win'
  | 'voting_kicked_civilian'
  | 'spy_kill';

type SplashScreenDevPanelProps = {
  splashEvent: SplashEventPayload | null;
  isHost: boolean;
  roomId: string | null;
  currentPlayerId: string | null;
  /** Список игроков для победных баннеров (шпион пока выбирается случайно). */
  players?: Array<{ id: string; nickname: string; avatar_id: AvatarId }>;
  onTriggerSplash: (
    type: 'system_start' | 'system_pause' | VictorySplashType | 'voting',
    opts?: { countdownSeconds?: number; countdownLabel?: string }
  ) => void;
  onDismissSplash: () => void;
};

/**
 * Панель для теста SplashScreen + realtime.
 * Кнопки «Сплэш» только у хоста; баннер показывается из room.splash_event (у всех одновременно).
 */
export function SplashScreenDevPanel({
  splashEvent,
  isHost,
  roomId,
  currentPlayerId,
  players = [],
  onTriggerSplash,
  onDismissSplash,
}: SplashScreenDevPanelProps) {
  type ShowSplashType = SplashType | 'voting';
  const type = splashEvent?.type as ShowSplashType | undefined;
  const showSplash = type && splashEvent;

  // По окончании таймера (system_start) dismiss должен вызвать только хост, иначе все клиенты шлют dismiss и баннер пропадает сразу
  const handleSplashClose = () => {
    // 1. system_start закрывает только хост (у вас это уже было)
    if (type === 'system_start' && !isHost) return;

    // 2. ВАЖНО: Для всех остальных типов (voting, kill и т.д.)
    // Команду "Убрать баннер из БД" имеет право давать ТОЛЬКО хост.
    if (isHost) {
      onDismissSplash();
    } else {
      // Обычный игрок (client) просто ничего не делает.
      // Он ждет, пока Хост (у которого таймер тоже идет) отправит onDismissSplash.
      // Как только Хост обновит базу -> splashEvent станет null -> баннер исчезнет сам через пропсы.
      console.log('Ждем сигнала от хоста для закрытия...');
    }
  };

  return (
    <>
      {isHost && (
        <div
          style={{
            position: 'fixed',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {roomId && currentPlayerId && (
            <>
              <button
                type="button"
                onClick={() => onTriggerSplash('system_start', { countdownSeconds: 5 })}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Старт
              </button>
              <button
                type="button"
                onClick={() => onTriggerSplash('system_pause')}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Пауза
              </button>
              <button
                type="button"
                onClick={() => onTriggerSplash('game_over_spy_win')}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Победа шпиона
              </button>
              <button
                type="button"
                onClick={() => onTriggerSplash('game_over_civilians_win')}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Агенты победили
              </button>
              <button
                type="button"
                onClick={() => onTriggerSplash('voting_kicked_civilian', { countdownSeconds: 10 })}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Выгнали мирного
              </button>
              <button
                type="button"
                onClick={() => onTriggerSplash('spy_kill', { countdownSeconds: 10 })}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Убийство
              </button>
              <button
                type="button"
                onClick={() =>
                  onTriggerSplash('voting', {
                    countdownSeconds: 60,
                    countdownLabel: 'ОСТАЛОСЬ...',
                  })
                }
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Сплэш: Голосование
              </button>
            </>
          )}
          {showSplash && (
            <button
              type="button"
              onClick={() => {
                if (type === 'voting') playVFX('woosh_out');
                onDismissSplash();
              }}
              style={{
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Скрыть
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {showSplash && type === 'voting' ? (
          <VotingSplash
            key="voting"
            title="ГОЛОСОВАНИЕ"
            countdownLabel={splashEvent.countdownLabel ?? 'ОСТАЛОСЬ...'}
            countdownSeconds={
              splashEvent.countdownSeconds ?? 300
            }
            eventAt={splashEvent.at}
            onClose={handleSplashClose}
            colors={{ front: '#F3A221', back: '#B77918' }}
          />
        ) : showSplash ? (
          <SplashScreen
            key={type}
            type={type as SplashType}
            onClose={handleSplashClose}
            countdownSeconds={
              splashEvent.countdownSeconds ??
              (type === 'system_start' ? 5 : 10)
            }
            countdownLabel={splashEvent.countdownLabel}
            showContinueButton={isHost}
            eventAt={splashEvent.at}
            endsAt={splashEvent.ends_at}
            players={players}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
