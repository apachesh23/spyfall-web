import { useState, useEffect } from 'react';

type Player = {
  id: string;
  nickname: string;
  avatar: string;
};

type VotingIntermediateResultProps = {
  isOpen: boolean;
  result: {
    type: 'tie_revote' | 'tie_failed' | 'eliminated';
    eliminatedId?: string;
    wasSpy?: boolean;
    candidates?: string[];
    voteCounts: Record<string, number>;
  };
  players: Player[];
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
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose, countdownSeconds]);

  if (!isOpen) return null;

  // Сортируем голоса по убыванию
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
  } else if (result.type === 'eliminated' && !result.wasSpy) {
    const eliminated = players.find(p => p.id === result.eliminatedId);
    message = `Исключён мирный житель: ${eliminated?.nickname}. Игра продолжается`;
    emoji = '😔';
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

        {/* Таблица голосов */}
        <div style={{ marginBottom: '30px' }}>
          <h3>Голоса:</h3>
          {sortedVotes.map(({ player, votes }) => (
            <div
              key={player?.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                marginBottom: '8px',
                background: '#f5f5f5',
                borderRadius: '8px',
                border: player?.id === result.eliminatedId ? '3px solid red' : 'none',
              }}
            >
              <span style={{ fontSize: '18px' }}>
                {player?.avatar} {player?.nickname}
              </span>
              <span style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: player?.id === result.eliminatedId ? 'red' : 'black'
              }}>
                {votes} {votes === 1 ? 'голос' : votes < 5 ? 'голоса' : 'голосов'}
                {player?.id === result.eliminatedId && ' ☠️'}
              </span>
            </div>
          ))}
        </div>

        <hr style={{ margin: '30px 0' }} />

        {/* Сообщение */}
        <div style={{
          background: '#f5f5f5',
          padding: '30px',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>{emoji}</div>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>{message}</h3>
          
          {/* Таймер */}
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