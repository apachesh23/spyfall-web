type StartGameButtonProps = {
    playerCount: number;
    onStart: () => void;
    starting: boolean;
  };
  
  export function StartGameButton({ playerCount, onStart, starting }: StartGameButtonProps) {
    const canStart = playerCount >= 3;
  
    return (
      <button 
        onClick={onStart} 
        disabled={starting || !canStart}
      >
        {starting ? 'Запуск...' : 'Запустить игру'}
        {!canStart && ' (минимум 3 игрока)'}
      </button>
    );
  }