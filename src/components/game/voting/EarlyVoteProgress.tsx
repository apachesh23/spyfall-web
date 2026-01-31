type EarlyVoteProgressProps = {
    current: number;
    total: number;
  };
  
  export function EarlyVoteProgress({ current, total }: EarlyVoteProgressProps) {
    const percentage = Math.round((current / total) * 100);
    const threshold = Math.ceil(total / 2);
    const isReady = current >= threshold;
  
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '5px',
          fontSize: '14px',
          color: isReady ? 'green' : 'gray'
        }}>
          <span>За досрочное голосование:</span>
          <span><strong>{current} / {total}</strong> ({percentage}%)</span>
        </div>
        
        <div style={{ 
          background: '#e0e0e0', 
          height: '20px', 
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: isReady ? 'green' : 'orange',
            height: '100%',
            width: `${percentage}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        {isReady ? (
          <p style={{ color: 'green', marginTop: '5px', fontSize: '14px' }}>
            ✅ Порог достигнут! Голосование запустится автоматически
          </p>
        ) : (
          <p style={{ color: 'gray', marginTop: '5px', fontSize: '14px' }}>
            Нужно минимум {threshold} голосов для запуска
          </p>
        )}
      </div>
    );
  }