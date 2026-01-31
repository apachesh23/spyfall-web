type Player = {
    id: string;
    nickname: string;
    avatar: string;
    is_alive: boolean;
  };
  
  type GamePlayerListProps = {
    players: Player[];
    currentPlayerId: string | null;
    onlinePlayers: Set<string>;
  };
  
  export function GamePlayerList({ players, currentPlayerId, onlinePlayers }: GamePlayerListProps) {
    return (
      <div>
        <h2>Игроки ({players.filter(p => p.is_alive).length} живых):</h2>
        <ul>
          {players.map((player) => {
            const isOnline = onlinePlayers.has(player.id);
            const isMe = player.id === currentPlayerId;
            
            return (
              <li 
                key={player.id}
                style={{ 
                  opacity: player.is_alive ? 1 : 0.4,
                  textDecoration: player.is_alive ? 'none' : 'line-through'
                }}
              >
                {player.avatar} {player.nickname}
                {isMe && ' (ты)'}
                {isOnline ? ' 🟢' : ' 🔄'}
                {!player.is_alive && ' ☠️'}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }