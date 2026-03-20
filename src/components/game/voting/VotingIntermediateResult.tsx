// Сплэш только для ничьей и «голосование не состоялось». Изгнание показывается через SplashScreen (voting_kicked_civilian).

import { useState, useEffect } from 'react';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import type { GamePlayer } from '@/types';

type VotingIntermediateResultProps = {
  isOpen: boolean;
  result: {
    type: 'tie_revote' | 'tie_failed';
    voteCounts: Record<string, number>;
  };
  players: GamePlayer[];
  onClose: () => void;
  countdownSeconds?: number;
};

export function VotingIntermediateResult({
  isOpen,
  result,
  players,
  onClose,
  countdownSeconds = 10
}: VotingIntermediateResultProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(countdownSeconds);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds]);

  useEffect(() => {
    if (isOpen && countdown === 0) {
      const timer = setTimeout(() => onClose(), 0);
      return () => clearTimeout(timer);
    }
  }, [countdown, isOpen, onClose]);

  if (!isOpen) return null;

  const sortedVotes = Object.entries(result.voteCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([playerId, votes]) => ({
      player: players.find(p => p.id === playerId),
      votes
    }));

  let message = '';
  let emoji = '';

  if (result.type === 'tie_revote') {
    message = 'Ничья! Повторное голосование между лидерами';
    emoji = '🔄';
  } else if (result.type === 'tie_failed') {
    message = 'Голосование не состоялось. Игра продолжается';
    emoji = '🤝';
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90%',
      }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>📊 Результаты голосования</h2>

        <div style={{ marginBottom: '30px' }}>
          <h3>Голоса:</h3>
          {sortedVotes.map(({ player, votes }) => {
            if (!player) return null;
            return (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PlayerAvatar avatarId={player.avatar_id} size="sm" />
                  {player.nickname}
                </span>
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {votes} {votes === 1 ? 'голос' : votes < 5 ? 'голоса' : 'голосов'}
                </span>
              </div>
            );
          })}
        </div>

        <hr style={{ margin: '30px 0' }} />

        <div style={{
          background: '#f5f5f5',
          padding: '30px',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>{emoji}</div>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>{message}</h3>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: countdown <= 3 ? 'red' : 'black',
            marginTop: '20px',
          }}>
            {countdown}
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
            Продолжение через {countdown} сек...
          </p>
        </div>
      </div>
    </div>
  );
}
