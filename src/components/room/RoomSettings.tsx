import { useState } from 'react';

type Settings = {
  game_duration: number;
  vote_duration: number;
  spy_count: number;
  mode_roles: boolean;
  mode_theme: boolean;
  mode_hidden_threat: boolean;
  mode_shadow_alliance: boolean;
  mode_spy_chaos: boolean;
};

type RoomSettingsProps = {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onSave: () => Promise<void>;
};

export function RoomSettings({ settings, onSettingsChange, onSave }: RoomSettingsProps) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div style={{ border: '2px solid #333', padding: '15px', margin: '20px 0' }}>
      <h2>⚙️ Настройки игры</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          Время игры (мин): 
          <input 
            type="number" 
            min="1" 
            max="60" 
            value={settings.game_duration}
            onChange={(e) => onSettingsChange({...settings, game_duration: Number(e.target.value)})}
            style={{ marginLeft: '10px', width: '60px' }}
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
            style={{ marginLeft: '10px', width: '60px' }}
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
            disabled={settings.mode_spy_chaos}
            style={{ marginLeft: '10px', width: '60px' }}
          />
          {settings.mode_spy_chaos && <span> (авто)</span>}
        </label>
      </div>

      <h3>Режимы:</h3>

      <div style={{ marginBottom: '5px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={settings.mode_roles}
            onChange={(e) => onSettingsChange({...settings, mode_roles: e.target.checked})}
          />
          {' '}Режим с ролями
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={settings.mode_theme}
            onChange={(e) => onSettingsChange({...settings, mode_theme: e.target.checked})}
          />
          {' '}Показать тему локации
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={settings.mode_hidden_threat}
            onChange={(e) => onSettingsChange({...settings, mode_hidden_threat: e.target.checked})}
          />
          {' '}Скрытая угроза (убийство 1 раз)
        </label>
      </div>

      <div style={{ marginBottom: '5px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={settings.mode_shadow_alliance}
            onChange={(e) => onSettingsChange({...settings, mode_shadow_alliance: e.target.checked})}
          />
          {' '}Союз теней (шпионы знают друг друга)
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={settings.mode_spy_chaos}
            onChange={(e) => onSettingsChange({...settings, mode_spy_chaos: e.target.checked})}
          />
          {' '}Шпионский хаос (рандом кол-во шпионов)
        </label>
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
    </div>
  );
}