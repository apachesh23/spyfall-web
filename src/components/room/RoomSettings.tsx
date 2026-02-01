// src/components/room/RoomSettings.tsx - ИСПРАВЛЕНО: все видят, только хост может менять

import { useState } from 'react';
import type { Settings } from '@/types';

type RoomSettingsProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onSave: () => Promise<void>;
  isHost: boolean;  // ← ДОБАВЛЕНО
};

export function RoomSettings({ 
  settings, 
  onSettingsChange, 
  onSave,
  isHost  // ← ДОБАВЛЕНО
}: RoomSettingsProps) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!isHost) return;  // ← ДОБАВЛЕНО: защита
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div style={{ border: '2px solid #333', padding: '15px', margin: '20px 0' }}>
      <h2>⚙️ Настройки игры</h2>
      
      {/* Индикатор для не-хостов */}
      {!isHost && (
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          ℹ️ Только ведущий может изменять настройки
        </p>
      )}
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          Время игры (мин): 
          <input 
            type="number" 
            min="1" 
            max="60" 
            value={settings.game_duration}
            onChange={(e) => onSettingsChange({...settings, game_duration: Number(e.target.value)})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
            style={{ 
              marginLeft: '10px', 
              width: '60px',
              opacity: isHost ? 1 : 0.6,
              cursor: isHost ? 'text' : 'not-allowed'
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>
          Время голосования (мин): 
          <input 
            type="number" 
            min="0.5" 
            max="5" 
            step="0.5"
            value={settings.vote_duration}
            onChange={(e) => onSettingsChange({...settings, vote_duration: Number(e.target.value)})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
            style={{ 
              marginLeft: '10px', 
              width: '60px',
              opacity: isHost ? 1 : 0.6,
              cursor: isHost ? 'text' : 'not-allowed'
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>
          Кол-во шпионов: 
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={settings.spy_count}
            onChange={(e) => onSettingsChange({...settings, spy_count: Number(e.target.value)})}
            disabled={!isHost || settings.mode_spy_chaos}  // ← ИЗМЕНЕНО
            style={{ 
              marginLeft: '10px', 
              width: '60px',
              opacity: (isHost && !settings.mode_spy_chaos) ? 1 : 0.6,
              cursor: (isHost && !settings.mode_spy_chaos) ? 'text' : 'not-allowed'
            }}
          />
          {settings.mode_spy_chaos && <span> (авто)</span>}
        </label>
      </div>

      <h3>Режимы:</h3>

      <div style={{ marginBottom: '5px' }}>
        <label style={{ cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.6 }}>
          <input 
            type="checkbox" 
            checked={settings.mode_roles}
            onChange={(e) => onSettingsChange({...settings, mode_roles: e.target.checked})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
          />
          {' '}Режим с ролями
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label style={{ cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.6 }}>
          <input 
            type="checkbox" 
            checked={settings.mode_theme}
            onChange={(e) => onSettingsChange({...settings, mode_theme: e.target.checked})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
          />
          {' '}Режим с темами
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label style={{ cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.6 }}>
          <input 
            type="checkbox" 
            checked={settings.mode_hidden_threat}
            onChange={(e) => onSettingsChange({...settings, mode_hidden_threat: e.target.checked})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
          />
          {' '}Скрытая угроза
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label style={{ cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.6 }}>
          <input 
            type="checkbox" 
            checked={settings.mode_shadow_alliance}
            onChange={(e) => onSettingsChange({...settings, mode_shadow_alliance: e.target.checked})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
          />
          {' '}Теневой альянс
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ cursor: isHost ? 'pointer' : 'not-allowed', opacity: isHost ? 1 : 0.6 }}>
          <input 
            type="checkbox" 
            checked={settings.mode_spy_chaos}
            onChange={(e) => onSettingsChange({...settings, mode_spy_chaos: e.target.checked})}
            disabled={!isHost}  // ← ДОБАВЛЕНО
          />
          {' '}Хаос шпионов
        </label>
      </div>

      <button 
        onClick={handleSave}
        disabled={!isHost || saving}  // ← ИЗМЕНЕНО
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px',
          cursor: (isHost && !saving) ? 'pointer' : 'not-allowed',
          opacity: (isHost && !saving) ? 1 : 0.6
        }}
      >
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
    </div>
  );
}