type Player = {
    id: string;
    nickname: string;
    avatar: string;
    is_host: boolean;
  };
  
  type PlayerListProps = {
    players: Player[];
    currentPlayerId: string | null;
    onlinePlayers: Set<string>;
    isHost: boolean;
    onKick: (playerId: string) => void;
    kicking: string | null;
  };
  
  export function PlayerList({ 
    players, 
    currentPlayerId, 
    onlinePlayers, 
    isHost, 
    onKick, 
    kicking 
  }: PlayerListProps) {
    return (
      <div>
        <h2>Игроки ({players.length}):</h2>
        <ul>
          {players.map((player) => {
            const isOnline = onlinePlayers.has(player.id);
            const isMe = player.id === currentPlayerId;
            
            return (
              <li key={player.id}>
                {player.avatar} {player.nickname}
                {isMe && ' (ты)'}
                {player.is_host && ' 👑'}
                {isOnline ? ' 🟢' : ' 🔄'}
                
                {isHost && !isMe && !player.is_host && (
                  <button 
                    onClick={() => onKick(player.id)}
                    disabled={kicking === player.id}
                    style={{ marginLeft: '10px' }}
                  >
                    {kicking === player.id ? '...' : '❌'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }