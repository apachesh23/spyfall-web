// src/components/game/info/GameInfo.tsx - ИСПРАВЛЕНО

type GameInfoProps = {
  isSpy: boolean;
  locationName: string;
  theme: string | null;  // ← ИСПРАВЛЕНО: было string
  myRole: string | null;
  showTheme: boolean;
  showRole: boolean;
  spyIds: string[];
  showAllies: boolean;
};

export function GameInfo({ 
  isSpy, 
  locationName, 
  theme, 
  myRole, 
  showTheme,
  showRole,
  spyIds,
  showAllies
}: GameInfoProps) {
  return (
    <div style={{ border: '3px solid #333', padding: '20px', marginBottom: '20px' }}>
      {isSpy ? (
        <div>
          <h2 style={{ color: 'red' }}>🕵️ Ты ШПИОН</h2>
          <p><strong>Локация:</strong> ❓❓❓ (скрыта)</p>
          <p><strong>Тема:</strong> {theme || 'Нет темы'}</p>
          <p>Попробуй угадать локацию или не попадись!</p>
          
          {showAllies && spyIds.length > 1 && (
            <p style={{ color: 'orange' }}>
              🤝 Союзники-шпионы: {spyIds.length - 1} чел.
            </p>
          )}
        </div>
      ) : (
        <div>
          <h2 style={{ color: 'green' }}>👤 Ты МИРНЫЙ</h2>
          <p><strong>Локация:</strong> {locationName}</p>
          {showTheme && <p><strong>Тема:</strong> {theme || 'Нет темы'}</p>}
          {showRole && myRole && <p><strong>Твоя роль:</strong> {myRole}</p>}
          <p>Найди шпиона среди игроков!</p>
        </div>
      )}
    </div>
  );
}