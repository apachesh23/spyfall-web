import { useState, useEffect, useRef } from 'react';

type Player = {
  id: string;
  nickname: string;
  avatar: string;
  is_alive: boolean;
};

type VotingModalProps = {
  isOpen: boolean;
  players: Player[];
  currentPlayerId: string | null;
  votedPlayers: Set<string>;
  endsAt: string;
  onVote: (suspectId: string) => void;
  myVote: string | null;
  onTimeExpired: () => void;
  revoteCandidates?: string[]; // Для повторного голосования
};

export function VotingModal({
  isOpen,
  players,
  currentPlayerId,
  votedPlayers,
  endsAt,
  onVote,
  myVote,
  onTimeExpired,
  revoteCandidates = []
}: VotingModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const expiredHandled = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      expiredHandled.current = false;
      return;
    }

    const endTime = new Date(endsAt).getTime();
    
    function updateTimer() {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);
      
      if (remaining === 0 && !expiredHandled.current) {
        expiredHandled.current = true;
        console.log('⏰ Voting time expired!');
        onTimeExpired();
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, endsAt, onTimeExpired]);

  if (!isOpen) return null;

  // КЛЮЧЕВАЯ ЛОГИКА:
  // Если есть revoteCandidates - показываем только их (повторное голосование)
  // Если нет - показываем всех живых (обычное голосование)
  const isRevote = revoteCandidates.length > 0;
  const displayPlayers = isRevote
    ? players.filter(p => revoteCandidates.includes(p.id))
    : players.filter(p => p.is_alive);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const hasVoted = !!myVote;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{ marginTop: 0 }}>
          {isRevote ? '🔄 Повторное голосование' : '🗳️ Голосование'}
        </h2>

        {isRevote && (
          <p style={{ 
            background: '#fff3e0', 
            padding: '10px', 
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '15px'
          }}>
            ⚠️ Была ничья! Выбор только между лидерами.
          </p>
        )}
        
        <div style={{
          background: '#f5f5f5',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>Время на голосование:</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: minutes < 1 ? 'red' : 'black' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {hasVoted ? (
          <div style={{
            background: '#e8f5e9',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <p style={{ margin: 0, color: 'green' }}>
              ✅ Ты проголосовал за: <strong>{players.find(p => p.id === myVote)?.nickname}</strong>
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
              Ожидаем остальных игроков или окончания таймера...
            </p>
          </div>
        ) : (
          <>
            <h3>Выбери подозреваемого:</h3>
            <div style={{ marginBottom: '20px' }}>
              {displayPlayers.map((player) => {
                const isMe = player.id === currentPlayerId;
                const isDisabled = isMe;
                const isSelected = selectedPlayer === player.id;
                
                return (
                  <div
                    key={player.id}
                    onClick={() => !isDisabled && setSelectedPlayer(player.id)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: isSelected ? '3px solid blue' : '2px solid #ddd',
                      borderRadius: '8px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#e3f2fd' : isDisabled ? '#f5f5f5' : 'white',
                      opacity: isDisabled ? 0.6 : 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>
                      {player.avatar} {player.nickname}
                      {isMe && ' (ты)'}
                    </span>
                    <span style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {votedPlayers.has(player.id) && (
                        <span style={{ color: 'green', fontSize: '14px' }}>✓</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => selectedPlayer && onVote(selectedPlayer)}
              disabled={!selectedPlayer}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                background: selectedPlayer ? 'blue' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedPlayer ? 'pointer' : 'not-allowed',
              }}
            >
              Проголосовать
            </button>
          </>
        )}

        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          Проголосовало: {votedPlayers.size} / {displayPlayers.length}
        </div>
      </div>
    </div>
  );
}