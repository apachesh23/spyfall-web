type AvatarCarouselProps = {
    selectedAvatar: string;
    onSelect: (avatar: string) => void;
  };
  
  export function AvatarCarousel({ selectedAvatar, onSelect }: AvatarCarouselProps) {
    // Пока простой список, потом сделаешь красивую карусель
    const avatars = ['🐶', '🐱', '🐼', '🦊', '🐯', '🦁', '🐸', '🐵', '🐰', '🐨'];
  
    return (
      <div>
        <h2>Выбери аватар:</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {avatars.map((avatar) => (
            <button
              key={avatar}
              onClick={() => onSelect(avatar)}
              style={{
                fontSize: '40px',
                padding: '10px',
                border: selectedAvatar === avatar ? '3px solid blue' : '1px solid gray',
                background: 'white',
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>
    );
  }