'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/hooks/game/useGameData';
import { useGameRealtime } from '@/hooks/game/useGameRealtime';
import { 
  GameInfo, 
  GameTimer, 
  GamePlayerList,
  EarlyVoteButton,
  EarlyVoteProgress,
  VotingModal,
  VotingIntermediateResult,
  VotingFinalResults
} from '@/components/game';

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  
  const {
    loading,
    gameData,
    players,
    currentPlayerId,
    isHost,
    roomId,
    myWantsEarlyVote,
  } = useGameData(code);

  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const [wantsEarlyVote, setWantsEarlyVote] = useState(false);
  const [earlyVoteCount, setEarlyVoteCount] = useState(0);
  const [togglingVote, setTogglingVote] = useState(false);
  
  // Voting modal state
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [votingEndsAt, setVotingEndsAt] = useState<string | null>(null);
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());
  const [myVote, setMyVote] = useState<string | null>(null);
  const [revoteCandidates, setRevoteCandidates] = useState<string[]>([]);
  
  // Results modal state
  const [showIntermediateResult, setShowIntermediateResult] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [votingResult, setVotingResult] = useState<any>(null);
  
  // Timer pause state
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [currentEndsAt, setCurrentEndsAt] = useState<string | null>(null);
  
  const expiredHandled = useRef(false);
  const finishingRef = useRef(false); // ← ДОБАВИЛИ

  useEffect(() => {
    setWantsEarlyVote(myWantsEarlyVote);
    const count = players.filter(p => p.is_alive && p.wants_early_vote).length;
    setEarlyVoteCount(count);
  }, [myWantsEarlyVote, players]);

  useEffect(() => {
    if (gameData?.endsAt) {
      setCurrentEndsAt(gameData.endsAt);
    }
  }, [gameData?.endsAt]);

  const handleEarlyVoteUpdate = useCallback((data: { playerId: string; wantsVote: boolean; totalVotes: number; totalPlayers: number }) => {
    console.log('📊 Early vote update received:', data);
    setEarlyVoteCount(data.totalVotes);
    
    if (data.playerId === currentPlayerId) {
      setWantsEarlyVote(data.wantsVote);
    }
  }, [currentPlayerId]);

  const handleVotingStarted = useCallback((endsAt: string) => {
    console.log('🎬 Opening voting modal! Ends at:', endsAt);
    setIsVotingOpen(true);
    setVotingEndsAt(endsAt);
    setVotedPlayers(new Set());
    setMyVote(null);
    setShowIntermediateResult(false);
    setShowFinalResult(false);
    setVotingResult(null);
    setRevoteCandidates([]);
  }, []);

  const handleVoteCast = useCallback((voterId: string) => {
    console.log('✅ Player voted:', voterId);
    setVotedPlayers(prev => new Set([...prev, voterId]));
  }, []);

  const finishVoting = useCallback(async () => {
    if (!roomId) return;
    
    if (finishingRef.current) {
      console.log('⚠️ Finish already in progress, skipping');
      return;
    }
    
    finishingRef.current = true;
    console.log('🏁 Calling finish API...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек timeout
      
      const response = await fetch('/api/game/vote/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
        signal: controller.signal,
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        const data = await response.json();
        console.error('Finish error:', data.error);
        throw new Error(data.error || 'Failed to finish voting');
      }
      
      console.log('✅ Finish API call successful');
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⏰ Finish request timeout - trying fallback');
      } else {
        console.error('❌ Finish voting error:', err);
      }
      
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если ошибка - закрываем модал принудительно
      // чтобы не зависнуть навсегда
      console.log('🔄 Forcing modal close due to error');
      setIsVotingOpen(false);
      
    } finally {
      // ИСПРАВЛЕНО: Быстрее сбрасываем флаг (500мс вместо 2000мс)
      setTimeout(() => {
        finishingRef.current = false;
        console.log('🔓 Finish lock released');
      }, 500);
    }
  }, [roomId]);

  const handleVotingTimeExpired = useCallback(async () => {
    console.log('⏰ Voting time expired!');
    
    // Пытаемся завершить голосование через API
    await finishVoting();
    
    // НОВОЕ: Если через 3 секунды модал все еще открыт - закрываем принудительно
    setTimeout(() => {
      if (isVotingOpen) {
        console.warn('⚠️ Forcing modal close after timeout - API might have failed');
        setIsVotingOpen(false);
        setVotedPlayers(new Set());
        setMyVote(null);
        finishingRef.current = false; // Сбрасываем флаг принудительно
      }
    }, 3000);
  }, [finishVoting, isVotingOpen]);

  // Изменить handleAllVotesCollected
  const handleAllVotesCollected = useCallback(() => {
    console.log('🎯 All votes collected!');
    
    if (!isVotingOpen) {
      console.warn('⚠️ Voting modal already closed');
      return;
    }
    
    if (isHost) {
      console.log('🎖️ I am host, finishing voting immediately');
      finishVoting();
    } else {
      console.log('⏳ Waiting for host... will retry in 3s if needed');
      
      // Fallback: если через 3 секунды модал все еще открыт - попробуем сами
      setTimeout(() => {
        if (isVotingOpen && !finishingRef.current) {
          console.log('⚠️ Host did not finish, taking over as backup');
          finishVoting();
        }
      }, 3000);
    }
  }, [finishVoting, isVotingOpen, isHost]);

  const handleVotingFinished = useCallback((data: { result: any }) => {
    console.log('🏁 Voting finished!', data);
    
    finishingRef.current = false;
    
    const { result } = data;
    setVotingResult(result);
    setIsVotingOpen(false);
    
    if (result.type === 'tie_revote') {
      console.log('🔄 Starting revote with candidates:', result.candidates);
      setRevoteCandidates(result.candidates);
      setShowIntermediateResult(true);
      
      setTimeout(() => {
        setShowIntermediateResult(false);
        
        console.log('🔄 Opening revote modal');
        setIsVotingOpen(true);
        setVotingEndsAt(result.revoteEndsAt);
        
        // Сбрасываем голоса от первого раунда
        setVotedPlayers(new Set());
        setMyVote(null);
        
        // Автоголоса кандидатов УЖЕ созданы на сервере
        // vote_cast events придут автоматически и обновят:
        // - votedPlayers (добавят кандидатов)
        // - myVote (если я кандидат)
        
        // УДАЛЕНО: клиентское автоголосование
        // Теперь голоса создаются на сервере при старте revote
        
      }, 5000);
      
    } else if (result.type === 'tie_failed' || (result.type === 'eliminated' && !result.isFinal)) {
      setShowIntermediateResult(true);
      
    } else if (result.type === 'eliminated' && result.isFinal) {
      setShowFinalResult(true);
    }
  }, []); // ВАЖНО: пустой массив deps (не нужны currentPlayerId и castVote)

  const handleGameEnded = useCallback((roomCode: string) => {
    console.log('🏁 Game ended! Redirecting to room...');
    
    // Очищаем localStorage кэш
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        // НЕ удаляем player_* ключи
        if (!key.startsWith('player_')) {
          localStorage.removeItem(key);
        }
      }
    });
    
    // Форсируем полную перезагрузку
    window.location.href = `/room/${roomCode}`;
  }, []);

  const handleGamePaused = useCallback(() => {
    console.log('⏸️ Game paused on client');
    setIsGamePaused(true);
  }, []);

  const handleGameResumed = useCallback((endsAt: string) => {
    console.log('▶️ Game resumed on client, new endsAt:', endsAt);
    setIsGamePaused(false);
    setCurrentEndsAt(endsAt);
  }, []);

  const handleIntermediateResultClose = useCallback(() => {
    console.log('Closing intermediate result');
    setShowIntermediateResult(false);
    
    // ИСПРАВЛЕНО: Не сбрасываем revoteCandidates при tie_revote
    if (votingResult?.type !== 'tie_revote') {
      setVotingResult(null);
      setRevoteCandidates([]);
      setWantsEarlyVote(false);
      setEarlyVoteCount(0);
    }
  }, [votingResult]);

  async function endGame() {
    if (!roomId || !currentPlayerId) return;

    if (!confirm('Завершить игру и вернуться в комнату ожидания?')) return;

    try {
      const response = await fetch('/api/game/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  useGameRealtime({
    roomId,
    playerId: currentPlayerId,
    onOnlinePlayersChange: setOnlinePlayers,
    onEarlyVoteUpdate: handleEarlyVoteUpdate,
    onVotingStarted: handleVotingStarted,
    onVoteCast: handleVoteCast,
    onAllVotesCollected: handleAllVotesCollected,
    onVotingFinished: handleVotingFinished,
    onGameEnded: handleGameEnded,
    onGamePaused: handleGamePaused,
    onGameResumed: handleGameResumed,
  });

  async function toggleEarlyVote() {
    if (!roomId || !currentPlayerId) return;
    
    setTogglingVote(true);
    
    try {
      const response = await fetch('/api/game/early-vote/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId: currentPlayerId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Ошибка');
      }
      
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    } finally {
      setTogglingVote(false);
    }
  }

  async function castVote(suspectId: string) {
    if (!roomId || !currentPlayerId) return;

    try {
      const response = await fetch('/api/game/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, voterId: currentPlayerId, suspectId }),
      });

      if (response.ok) {
        setMyVote(suspectId);
        console.log('✅ My vote cast for:', suspectId);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка голосования');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  function handleTimeExpire() {
    if (expiredHandled.current) return;
    expiredHandled.current = true;
    console.log('⏰ Time expired! Starting vote...');
  }

  if (loading) return <div>Загрузка игры...</div>;
  if (!gameData) return <div>Ошибка загрузки</div>;

  const alivePlayers = players.filter(p => p.is_alive);
  const isAlive = gameData.isAlive;

  // КЛЮЧ для форсирования ремаунта при новой игре
  const gameKey = `game-${roomId}-${gameData.endsAt}`;

  return (
    <div key={gameKey}>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>🎮 Игра в разгаре!</h1>
        
        <GameInfo
          isSpy={gameData.isSpy}
          locationName={gameData.locationName}
          theme={gameData.theme}
          myRole={gameData.myRole}
          showTheme={gameData.settings.mode_theme}
          showRole={gameData.settings.mode_roles}
          spyIds={gameData.spyIds}
          showAllies={gameData.settings.mode_shadow_alliance}
        />
  
        <GameTimer 
          endsAt={currentEndsAt || gameData.endsAt}
          onExpire={handleTimeExpire}
          isPaused={isGamePaused}
        />
  
        <GamePlayerList
          players={players}
          currentPlayerId={currentPlayerId}
          onlinePlayers={onlinePlayers}
        />
  
        <hr style={{ margin: '30px 0' }} />
  
        <h3>Действия:</h3>
        
        {!gameData.isSpy && isAlive && (
          <div>
            <EarlyVoteButton
              isActive={wantsEarlyVote}
              onToggle={toggleEarlyVote}
              disabled={togglingVote}
            />
            <EarlyVoteProgress
              current={earlyVoteCount}
              total={alivePlayers.length}
            />
          </div>
        )}
  
        {gameData.isSpy && isAlive && (
          <button>🎯 Назвать локацию (скоро)</button>
        )}
  
        {isHost && (
          <div style={{ marginTop: '20px', borderTop: '2px solid #ccc', paddingTop: '20px' }}>
            <h3>Панель ведущего:</h3>
            <button>⏸️ Пауза (скоро)</button>
            <button style={{ marginLeft: '10px' }}>🏁 Завершить игру (скоро)</button>
          </div>
        )}
  
          {isAlive && votingEndsAt && (
          <VotingModal
            isOpen={isVotingOpen}
            players={players}
            currentPlayerId={currentPlayerId}
            votedPlayers={votedPlayers}
            endsAt={votingEndsAt}
            onVote={castVote}
            myVote={myVote}
            onTimeExpired={handleVotingTimeExpired} // ← ИЗМЕНЕНО: используем новый обработчик
            revoteCandidates={revoteCandidates}
          />
        )}
  
        {votingResult && showIntermediateResult && (
          <VotingIntermediateResult
            isOpen={showIntermediateResult}
            result={votingResult}
            players={players}
            onClose={handleIntermediateResultClose}
            countdownSeconds={votingResult.type === 'tie_revote' ? 3 : 10}
          />
        )}
  
        {votingResult && showFinalResult && votingResult.type === 'eliminated' && (
          <VotingFinalResults
            isOpen={showFinalResult}
            result={votingResult}
            players={players}
            spyIds={gameData.spyIds}
            isHost={isHost}
            onEndGame={endGame}
          />
        )}
      </div>
    </div>
  );
}