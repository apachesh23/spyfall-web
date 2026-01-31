import { useState } from 'react';
import { AvatarCarousel } from './AvatarCarousel';

type PlayerFormProps = {
  onSubmit: (nickname: string, avatar: string) => Promise<void>;
  buttonText: string;
  loading?: boolean;
  error?: string;
};

export function PlayerForm({ onSubmit, buttonText, loading = false, error }: PlayerFormProps) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🐶');

  async function handleSubmit() {
    if (!nickname.trim()) {
      alert('Введи никнейм!');
      return;
    }
    await onSubmit(nickname.trim(), avatar);
  }

  return (
    <div>
      <AvatarCarousel selectedAvatar={avatar} onSelect={setAvatar} />

      <h2>Твой никнейм:</h2>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Введи никнейм"
        maxLength={20}
        style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '15px', 
          fontSize: '18px',
          marginTop: '20px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Загрузка...' : buttonText}
      </button>
    </div>
  );
}