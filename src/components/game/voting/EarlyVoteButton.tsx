type EarlyVoteButtonProps = {
    isActive: boolean;
    onToggle: () => void;
    disabled?: boolean;
  };
  
  export function EarlyVoteButton({ isActive, onToggle, disabled }: EarlyVoteButtonProps) {
    return (
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          border: isActive ? '3px solid orange' : '2px solid gray',
          background: isActive ? '#fff3e0' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '8px',
          width: '100%'
        }}
      >
        {isActive ? '✋ Отменить досрочное голосование' : '🗳️ За досрочное голосование'}
      </button>
    );
  }