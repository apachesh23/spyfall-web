// src/components/game/voting/VotingModal.tsx - ИСПРАВЛЕНО

import { useState, useEffect, useRef } from 'react';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import type { GamePlayer } from '@/types';

type VotingModalProps = {
  isOpen: boolean;
  players: GamePlayer[];  // ← ИСПРАВЛЕНО: было Player[]
  currentPlayerId: string | null;
  votedPlayers: Set<string>;
  endsAt: string;
  onVote: (suspectId: string) => void;
  myVote: string | null;
  onTimeExpired: () => void;
  revoteCandidates?: string[];
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

  const isRevote = revoteCandidates.length > 0;
  const isCandidate = isRevote && currentPlayerId && revoteCandidates.includes(currentPlayerId);
  
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

        <div style={{
          background: isRevote ? '#fff3e0' : '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
            {isRevote ? 'Выбери кого исключить' : 'Выбери подозреваемого'}
          </p>
        </div>

        {hasVoted ? (
          <div style={{
            background: '#e8f5e9',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Твой голос учтён!
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
              Ожидаем остальных игроков...
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
              Проголосовало: {votedPlayers.size} / {displayPlayers.length}
            </p>
          </div>
        ) : (
          <>
            {isCandidate && (
              <div style={{
                background: '#ffebee',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'red' }}>
                  ⚠️ Ты один из кандидатов на исключение!<br/>
                  Твой голос автоматически добавлен.
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              {displayPlayers.map((player) => {
                const isMe = player.id === currentPlayerId;
                const isSelected = selectedPlayer === player.id;
                const isDisabled = isCandidate && isMe;

                return (
                  <div
                    key={player.id}
                    onClick={() => !isDisabled && setSelectedPlayer(player.id)}
                    style={{
                      padding: '15px',
                      marginBottom: '10px',
                      border: isSelected
                        ? '3px solid blue'
                        : '2px solid #ddd',
                      borderRadius: '8px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#e3f2fd' : isDisabled ? '#f5f5f5' : 'white',
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayerAvatar avatarId={player.avatar_id} size="sm" />
                      <span style={{ fontSize: '16px' }}>
                        {player.nickname}
                        {isMe && ' (Ты)'}
                      </span>
                      {votedPlayers.has(player.id) && (
                        <span style={{ marginLeft: 'auto', color: 'green' }}>✓</span>
                      )}
                    </div>
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
                fontWeight: 'bold',
                background: selectedPlayer ? '#2196f3' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedPlayer ? 'pointer' : 'not-allowed',
              }}
            >
              Голосовать
            </button>
          </>
        )}
      </div>
    </div>
  );
}