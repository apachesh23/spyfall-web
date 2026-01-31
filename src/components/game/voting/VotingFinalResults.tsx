type Player = {
    id: string;
    nickname: string;
    avatar: string;
    is_spy?: boolean; // ← ДОБАВИЛИ
  };
  
  type VotingFinalResultsProps = {
    isOpen: boolean;
    result: {
      eliminatedId: string;
      wasSpy: boolean;
      winner: 'civilians' | 'spies' | null;
      voteCounts: Record<string, number>;
    };
    players: Player[];
    spyIds: string[]; // ← ДОБАВИЛИ список шпионов
    isHost: boolean;
    onEndGame: () => void;
  };
  
  export function VotingFinalResults({
    isOpen,
    result,
    players,
    spyIds,
    isHost,
    onEndGame
  }: VotingFinalResultsProps) {
    if (!isOpen) return null;
  
    const sortedVotes = Object.entries(result.voteCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, votes]) => ({
        player: players.find(p => p.id === playerId),
        votes
      }));
  
    const eliminated = players.find(p => p.id === result.eliminatedId);
    const civiliansWon = result.winner === 'civilians';
    const spies = players.filter(p => spyIds.includes(p.id));
  
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
          maxHeight: '80vh',
          overflow: 'auto',
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
  
          {/* Результат */}
          <div style={{
            background: civiliansWon ? '#e8f5e9' : '#ffebee',
            padding: '30px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '15px' }}>
              {civiliansWon ? '🎉' : '😈'}
            </div>
            <h2 style={{ 
              color: civiliansWon ? 'green' : 'red', 
              margin: '0 0 15px 0' 
            }}>
              {civiliansWon ? 'Мирные победили!' : 'Шпион победил!'}
            </h2>
            <p style={{ fontSize: '18px', margin: '0 0 10px 0' }}>
              <strong>Исключён:</strong> {eliminated?.avatar} {eliminated?.nickname}
            </p>
            <p style={{ fontSize: '16px', margin: 0 }}>
              {result.wasSpy ? (
                <span style={{ color: 'green' }}>
                  ✅ Это был шпион!
                </span>
              ) : (
                <span style={{ color: 'red' }}>
                  ❌ Убит последний мирный житель
                </span>
              )}
            </p>
          </div>
  
          {/* НОВОЕ: Раскрытие шпионов */}
          <div style={{
            background: '#fff3e0',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>🕵️ Шпионы:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {spies.map(spy => (
                <div key={spy.id} style={{ 
                  fontSize: '18px', 
                  padding: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  {spy.avatar} {spy.nickname}
                </div>
              ))}
            </div>
          </div>
  
          {/* Кнопка завершения */}
          {isHost && (
            <button
              onClick={onEndGame}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                background: 'blue',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🏁 Завершить игру
            </button>
          )}
  
          {!isHost && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
              Ожидаем решения ведущего...
            </p>
          )}
        </div>
      </div>
    );
  }