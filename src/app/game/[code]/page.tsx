'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameData } from '@/hooks/game/useGameData';
import { useGameRealtime } from '@/hooks/game/useGameRealtime';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlayerList } from '@/components/player/PlayerList';
import { useReactions } from '@/contexts/ReactionsContext';
import { useRouteLoaderStore } from '@/store/route-loader-store';
import {
  GameModeCard,
  GameSpyBlock,
  GameLocationImage,
  GameTimerTop,
  GameEarlyVoteBlock,
  GameHintQuestionBlock,
  GameHintButton,
  VotingCard,
  VotingSplash,
  votingSplashStyles,
  VotingIntermediateResult,
  SpyGuessSplash,
  SpyGuessAutoWinContent,
  SpyGuessVoteContent,
} from '@/components/game';
import { GameHostButtons } from '@/components/game/host/GameHostButtons';
import { FullscreenLoader } from '@/components/layout/FullscreenLoader';
import { FooterBar } from '@/components/layout/FooterBar';
import { playUI, startGameMusic, stopGameMusic, startVoteMusic, stopVoteMusic, syncMusicVolume } from '@/lib/sound';
import styles from './layout.module.css';

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
    gameId,
    gameSplashEvent,
    isGamePaused,
    remainingTimeMs,
    myWantsEarlyVote,
    votingStatus,
    votingEndsAt: serverVotingEndsAt,
    votingPhase: serverVotingPhase,
    votingType: serverVotingType,
    votingResultEndsAt: serverVotingResultEndsAt,
    revoteCandidates: serverRevoteCandidates,
    spyGuessText,
    spyGuessStatus,
    spyGuessEndsAt,
    earlyVoteUsedCount,
    earlyVoteAvailableAt,
    votedPlayerIdsFromServer,
    myVoteFromServer,
    mySkippedFromServer,
    cancelRedirectToRoom,
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
  const [mySkipped, setMySkipped] = useState(false);
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string | null>(null);
  const [_revoteCandidates, setRevoteCandidates] = useState<string[]>([]);
  /** Фаза внутри одного события голосования: сбор голосов → экран результата 5с → закрытие или повторное голосование. */
  const [votingPhase, setVotingPhase] = useState<'voting' | 'result_no_vote' | 'result_winner' | 'result_tie' | 'revote' | 'revote_result_no_vote' | 'revote_result_winner'>('voting');
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const [splashExiting, setSplashExiting] = useState(false);
  const [votingClosedByRealtime, setVotingClosedByRealtime] = useState(false);

  // Results modal state
  const [showIntermediateResult, setShowIntermediateResult] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [votingResult, setVotingResult] = useState<any>(null);

  // Timer pause state
  const [currentEndsAt, setCurrentEndsAt] = useState<string | null>(null);
  const [pausingGame, setPausingGame] = useState(false);

  // Spy guess (угадывание локации шпионом)
  const [spyGuessYesCount, setSpyGuessYesCount] = useState(0);
  const [spyGuessNoCount, setSpyGuessNoCount] = useState(0);
  const [spyGuessMyVote, setSpyGuessMyVote] = useState<'yes' | 'no' | null>(null);
  const [showSpyWinByGuess, setShowSpyWinByGuess] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [endGameConfirmOpen, setEndGameConfirmOpen] = useState(false);

  const expiredHandled = useRef(false);
  const finishingRef = useRef(false);
  const votingPhaseRef = useRef(votingPhase);
  const eliminatedSplashShownRef = useRef<string | null>(null);
  const lastProcessedVotingFinishedRef = useRef<string | null>(null);
  const kickedSplashKeyRef = useRef<string | null>(null);
  const [showLoader, setShowLoader] = useState(true);
  votingPhaseRef.current = votingPhase;

  const reactions = useReactions();
  const stopGlobalLoader = useRouteLoaderStore((s) => s.stop);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (!loading) {
      stopGlobalLoader();
      timeout = setTimeout(() => setShowLoader(false), 800);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading, stopGlobalLoader]);

  // --- MUSIC (игровая комната): как в Lobby ---
  useEffect(() => {
    startGameMusic();

    const unlockAudio = () => {
      syncMusicVolume();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => syncMusicVolume(), 150);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopGameMusic();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // --- MUSIC голосования: game выключена на весь процесс; vote1 на первое голосование (+ микро-этапы), vote2 на повторное ---
  const votingSessionActive = !votingClosedByRealtime && (votingStatus === 'active' || splashExiting);

  useEffect(() => {
    if (!votingSessionActive) {
      stopVoteMusic();
      startGameMusic();
      return;
    }
    stopGameMusic(false);
    return () => {
      stopVoteMusic();
      startGameMusic();
    };
  }, [votingSessionActive]);

  // --- MUSIC: финальный сплэш победы — глушим любую фоновую музыку ---
  const isGameOverSplashVisible =
    (votingResult && showFinalResult) || showSpyWinByGuess;

  useEffect(() => {
    if (!isGameOverSplashVisible) return;
    stopVoteMusic();
    stopGameMusic(false);
  }, [isGameOverSplashVisible]);

  useEffect(() => {
    if (!votingSessionActive) return;
    if (serverVotingPhase === 'collecting') startVoteMusic('first');
    else if (serverVotingPhase === 'revote') startVoteMusic('revote');
  }, [votingSessionActive, serverVotingPhase]);

  useEffect(() => {
    setWantsEarlyVote(myWantsEarlyVote);
    const count = players.filter(p => p.is_alive && p.wants_early_vote).length;
    setEarlyVoteCount(count);
  }, [myWantsEarlyVote, players]);

  // Обратный отсчёт результата голосования (5с) считаем от серверного voting_result_ends_at
  useEffect(() => {
    if (!serverVotingResultEndsAt) {
      setResultCountdown(null);
      return;
    }
    const update = () => {
      const diffSec = Math.ceil(
        (new Date(serverVotingResultEndsAt).getTime() - Date.now()) / 1000
      );
      setResultCountdown(diffSec > 0 ? diffSec : 0);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [serverVotingResultEndsAt]);

  // Когда resultCountdown дошёл до 0 — ack-result, затем задержка под анимацию закрытия, потом снять сплэш
  const countdown5HandledRef = useRef(false);
  const EXIT_ANIMATION_MS = 400;
  useEffect(() => {
    if (resultCountdown !== 0 || countdown5HandledRef.current || !roomId) return;
    const phase = votingPhase;
    if (phase !== 'result_no_vote' && phase !== 'revote_result_no_vote' && phase !== 'result_winner' && phase !== 'revote_result_winner' && phase !== 'result_tie') return;
    countdown5HandledRef.current = true;
    setSplashExiting(true);

    const doAckAndTransition = async () => {
      try {
        await fetch('/api/game/vote/ack-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        });
      } catch (e) {
        console.error('Ack result failed:', e);
      }
      setTimeout(() => {
        setResultCountdown(null);
        setSplashExiting(false);
        if (phase === 'result_no_vote' || phase === 'revote_result_no_vote') {
          setVotedPlayers(new Set());
          setMyVote(null);
          setVotingPhase('voting');
        } else if (phase === 'result_tie' && votingResult?.type === 'tie_revote') {
          setVotedPlayers(new Set());
          setMyVote(null);
          setMySkipped(false);
          setSelectedVoteTarget(null);
          setVotingPhase('revote');
        }
      }, EXIT_ANIMATION_MS);
    };
    doAckAndTransition();
  }, [resultCountdown, votingPhase, votingResult, roomId]);
  useEffect(() => {
    countdown5HandledRef.current = false;
  }, [serverVotingResultEndsAt]);

  useEffect(() => {
    if (gameData?.endsAt) {
      setCurrentEndsAt(gameData.endsAt);
    }
  }, [gameData?.endsAt]);

  // Синхронизация локального «голосование открыто» с серверным voting_status
  useEffect(() => {
    setIsVotingOpen(votingStatus === 'active');
    if (votingStatus === 'active') setVotingClosedByRealtime(false);
  }, [votingStatus]);

  // Восстановление списка проголосовавших и своего голоса после перезагрузки (данные из БД)
  useEffect(() => {
    if (votingStatus !== 'active') return;
    if (votedPlayerIdsFromServer.length > 0) {
      setVotedPlayers((prev) => new Set([...votedPlayerIdsFromServer, ...prev]));
    }
    if (myVoteFromServer != null) setMyVote(myVoteFromServer);
    if (mySkippedFromServer) setMySkipped(true);
  }, [votingStatus, votedPlayerIdsFromServer, myVoteFromServer, mySkippedFromServer]);

  // Восстановление сплэша после F5 из splash_event (не перебивать broadcast-поток)
  const splashRestoredRef = useRef(false);
  useEffect(() => {
    if (!gameSplashEvent || !players.length || splashRestoredRef.current) return;
    if (votingResult) return; // Уже получили результат через broadcast — не перезаписывать
    const ev = gameSplashEvent as {
      type: string;
      phase?: string;
      at?: string;
      exile_ends_at?: string;
      eliminatedId?: string;
      wasSpy?: boolean;
      winner?: string;
      voteCounts?: Record<string, number>;
    };
    if (ev.type === 'game_over_spy_win') {
      setShowSpyWinByGuess(true);
      splashRestoredRef.current = true;
    } else if (ev.type === 'voting_final_transition') {
      const now = Date.now();
      const at = ev.at ? new Date(ev.at).getTime() : 0;
      const exileEndsAt =
        ev.exile_ends_at ? new Date(ev.exile_ends_at).getTime()
        : at > 0 ? at + 10 * 1000
        : 0;
      const votingResultPayload = {
        type: 'eliminated' as const,
        eliminatedId: ev.eliminatedId,
        wasSpy: ev.wasSpy ?? false,
        isFinal: true,
        winner: ev.winner ?? 'spies',
        voteCounts: ev.voteCounts ?? {},
      };
      // at+10 как основной ориентир (exile_ends_at может не дойти при репликации)
      const effectiveExileEnd = at > 0 ? at + 10 * 1000 : exileEndsAt;
      const showExile = effectiveExileEnd > 0 && now < effectiveExileEnd;
      if (showExile) {
        setVotingResult(votingResultPayload);
        setShowIntermediateResult(true);
      } else {
        setVotingResult(votingResultPayload);
        setShowFinalResult(true);
      }
      splashRestoredRef.current = true;
    } else if (ev.type === 'game_over_civilians_win' || ev.type === 'game_over_spy_win_voting') {
      const isFinalCiviliansLose = ev.winner === 'spies' && !ev.eliminatedId;
      setVotingResult(
        isFinalCiviliansLose
          ? { type: 'final_civilians_lose', voteCounts: ev.voteCounts ?? {}, isFinal: true, winner: 'spies' }
          : {
              type: 'eliminated',
              eliminatedId: ev.eliminatedId,
              wasSpy: ev.wasSpy ?? (ev.winner === 'civilians'),
              isFinal: true,
              winner: ev.winner ?? (ev.wasSpy ? 'civilians' : 'spies'),
              voteCounts: ev.voteCounts ?? {},
            }
      );
      setShowFinalResult(true);
      splashRestoredRef.current = true;
    } else if (ev.type === 'voting_kicked_civilian') {
      const wasSpy = ev.wasSpy ?? false;
      setVotingResult({
        type: 'eliminated',
        eliminatedId: ev.eliminatedId,
        wasSpy,
        isFinal: wasSpy,
        winner: wasSpy ? 'civilians' : undefined,
        voteCounts: ev.voteCounts ?? {},
      });
      setShowIntermediateResult(true);
      splashRestoredRef.current = true;
    }
  }, [gameSplashEvent, players.length, votingResult]);

  const handleEarlyVoteUpdate = useCallback((data: { playerId: string; wantsVote: boolean; totalVotes: number; totalPlayers: number }) => {
    console.log('📊 Early vote update received:', data);
    setEarlyVoteCount(data.totalVotes);

    if (data.playerId === currentPlayerId) {
      setWantsEarlyVote(data.wantsVote);
    }
  }, [currentPlayerId]);

  const handleVotingStarted = useCallback((endsAt: string) => {
    console.log('🎬 Opening voting! Ends at:', endsAt);
    setVotingClosedByRealtime(false);
    setIsVotingOpen(true);
    setVotingEndsAt(endsAt);
    setVotedPlayers(new Set());
    setMyVote(null);
    setMySkipped(false);
    setSelectedVoteTarget(null);
    setShowIntermediateResult(false);
    setShowFinalResult(false);
    setVotingResult(null);
    setRevoteCandidates([]);
    setVotingPhase('voting');
    setResultCountdown(null);
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
        const data = await response.json().catch(() => ({}));
        const msg = data?.error || 'Failed to finish voting';
        if (response.status === 400 && (msg === 'Голосование уже завершено' || String(msg).includes('уже завершено'))) {
          console.log('Voting already finished by another client, waiting for broadcast result');
          return;
        }
        console.error('Finish error:', msg);
        throw new Error(msg);
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
    await finishVoting();
    setTimeout(() => {
      if (finishingRef.current === false) return;
      const phase = votingPhaseRef.current;
      if (phase === 'voting' || phase === 'revote') {
        console.warn('⚠️ Forcing modal close after timeout - API might have failed');
        setIsVotingOpen(false);
        setVotedPlayers(new Set());
        setMyVote(null);
        setVotingPhase('voting');
        finishingRef.current = false;
      }
    }, 5000);
  }, [finishVoting]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleVotingFinished = useCallback(async (data: { result: any; phase?: string }) => {
    console.log('🏁 Voting finished!', data);
    finishingRef.current = false;
    const { result, phase } = data;
    const resolvedPhase = (phase ?? 'result_no_vote') as 'result_no_vote' | 'result_winner' | 'result_tie' | 'revote_result_no_vote' | 'revote_result_winner';
    setVotingResult(result);
    setVotingPhase(resolvedPhase);
    if (resolvedPhase === 'result_winner' || resolvedPhase === 'revote_result_winner') {
      const eliminatedId = result?.type === 'eliminated' ? result.eliminatedId : null;
      const isFinalCiviliansLose = result?.type === 'final_civilians_lose';
      const payloadKey = `${resolvedPhase}_${result?.type ?? ''}_${eliminatedId ?? ''}`;
      if (lastProcessedVotingFinishedRef.current === payloadKey) {
        if (roomId) {
          try {
            await fetch('/api/game/vote/ack-result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId }),
            });
          } catch (e) {
            console.error('Ack result failed:', e);
          }
        }
        return;
      }
      lastProcessedVotingFinishedRef.current = payloadKey;
      setVotingClosedByRealtime(true);
      if (isFinalCiviliansLose) {
        setShowFinalResult(true);
      } else if (!eliminatedId || eliminatedSplashShownRef.current !== eliminatedId) {
        if (eliminatedId) {
          eliminatedSplashShownRef.current = eliminatedId;
          kickedSplashKeyRef.current = eliminatedId;
        }
        setShowIntermediateResult(true);
      }
      // ack-result сразу только когда не нужен сплэш изгнания: final_civilians_lose или победа шпионов. Победа мирных (eliminated+isFinal) — ack при закрытии сплэша изгнания.
      const shouldAckNow = isFinalCiviliansLose || (result?.isFinal === true && result?.winner !== 'civilians');
      if (roomId && shouldAckNow) {
        try {
          await fetch('/api/game/vote/ack-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
          });
        } catch (e) {
          console.error('Ack result failed:', e);
        }
      }
    }
  }, [roomId]);

  const handleVotingClosed = useCallback(() => {
    setVotingClosedByRealtime(true);
    setVotedPlayers(new Set());
    setMyVote(null);
    setMySkipped(false);
    setSelectedVoteTarget(null);
    setVotingPhase('voting');
    setResultCountdown(null);
    setRevoteCandidates([]);
    setIsVotingOpen(false);
    // Не сбрасываем votingResult — по нему показываем победный/промежуточный сплэш после закрытия голосования
  }, []);

  const handleVotingPhaseUpdated = useCallback((payload: { phase: string }) => {
    if (payload.phase === 'revote') {
      setVotingPhase('revote');
      setResultCountdown(null);
    }
  }, []);

  const handleGameEnded = useCallback((payload: { roomCode?: string; shareHash?: string }) => {
    const roomCode = payload?.roomCode;
    const shareHash = payload?.shareHash;
    console.log('🏁 Game ended! Redirecting...', shareHash ? 'to summary' : 'to room');

    // При любом завершении игры отменяем отложенный редирект в лобби из useGameData
    cancelRedirectToRoom?.();

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase')) {
        if (!key.startsWith('player_')) {
          localStorage.removeItem(key);
        }
      }
    });

    useRouteLoaderStore.getState().start();
    if (shareHash) {
      const roomParam = roomCode ? `?room=${encodeURIComponent(roomCode)}` : '';
      router.push(`/summary/${shareHash}${roomParam}`);
    } else if (roomCode) {
      router.push(`/room/${roomCode}`);
    }
  }, [router, cancelRedirectToRoom]);

  const handleGameResumed = useCallback((endsAt: string) => {
    console.log('▶️ Game resumed on client, new endsAt:', endsAt);
    setCurrentEndsAt(endsAt);
  }, []);

  const handleIntermediateResultClose = useCallback(() => {
    setShowIntermediateResult(false);
    if (votingResult?.type === 'tie_revote') {
      setRevoteCandidates(votingResult.candidates ?? []);
    } else if (votingResult?.type === 'eliminated' && votingResult?.isFinal) {
      if (roomId && votingResult?.winner === 'civilians') {
        fetch('/api/game/vote/ack-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        }).catch((e) => console.error('Ack result failed:', e));
      }
      setShowFinalResult(true);
    } else {
      setVotingResult(null);
      setRevoteCandidates([]);
      setWantsEarlyVote(false);
      setEarlyVoteCount(0);
      eliminatedSplashShownRef.current = null;
      lastProcessedVotingFinishedRef.current = null;
      kickedSplashKeyRef.current = null;
      // Для eliminated+!isFinal вызываем ack-result при закрытии сплэша (splash_event сохраняется до этого)
      if (votingResult?.type === 'eliminated' && !votingResult?.isFinal && roomId) {
        fetch('/api/game/vote/ack-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        }).catch((e) => console.error('Ack result failed:', e));
      }
    }
  }, [votingResult, roomId]);

  async function pauseGame() {
    if (!roomId || !currentPlayerId || !isHost) return;
    setPausingGame(true);
    try {
      const response = await fetch('/api/game/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId }),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Ошибка паузы');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка паузы');
    } finally {
      setPausingGame(false);
    }
  }

  async function resumeGame() {
    if (!roomId || !currentPlayerId || !isHost) return;
    try {
      const response = await fetch('/api/game/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId }),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Ошибка возобновления');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка возобновления');
    }
  }

  async function endGame() {
    if (!roomId || !currentPlayerId) return;
    await finishGameAndReturnToRoom();
  }

  /** Завершение игры без подтверждения (для кнопки на победном сплэше). */
  async function finishGameAndReturnToRoom() {
    if (!roomId || !currentPlayerId) return;
    try {
      const response = await fetch('/api/game/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostId: currentPlayerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Ошибка');
        return;
      }
      useRouteLoaderStore.getState().start();
      if (data.shareHash) {
        const roomParam = data.roomCode ? `?room=${encodeURIComponent(data.roomCode)}` : '';
        router.push(`/summary/${data.shareHash}${roomParam}`);
      } else {
        router.push(`/room/${code}`);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  const handleSpyGuessVote = useCallback((payload: { yesCount: number; noCount: number }) => {
    setSpyGuessYesCount(payload.yesCount);
    setSpyGuessNoCount(payload.noCount);
  }, []);

  const handleSpyGuessStarted = useCallback((payload: { autoWin: boolean }) => {
    if (!payload.autoWin) {
      setSpyGuessYesCount(0);
      setSpyGuessNoCount(0);
      setSpyGuessMyVote(null);
    }
  }, []);

  const handleSpyGuessFinished = useCallback((payload: { accepted: boolean }) => {
    if (payload.accepted) setShowSpyWinByGuess(true);
  }, []);

  const handleSpyGuessAutoWinAcked = useCallback(() => {
    setShowSpyWinByGuess(true);
  }, []);

  const handleSpyGuessVoteTimeExpired = useCallback(async () => {
    if (!roomId) return;
    try {
      await fetch('/api/game/spy-guess/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
    } catch (e) {
      console.error('Spy guess finish failed:', e);
    }
  }, [roomId]);

  const handleSpyGuessAllVoted = useCallback(() => {
    handleSpyGuessVoteTimeExpired();
  }, [handleSpyGuessVoteTimeExpired]);

  const { sendReaction } = useGameRealtime({
    roomId,
    playerId: currentPlayerId,
    onOnlinePlayersChange: setOnlinePlayers,
    onEarlyVoteUpdate: handleEarlyVoteUpdate,
    onVotingStarted: handleVotingStarted,
    onVoteCast: handleVoteCast,
    onAllVotesCollected: handleAllVotesCollected,
    onVotingFinished: handleVotingFinished,
    onVotingClosed: handleVotingClosed,
    onVotingPhaseUpdated: handleVotingPhaseUpdated,
    onGameEnded: handleGameEnded,
    onGameResumed: handleGameResumed,
    onSpyGuessStarted: handleSpyGuessStarted,
    onSpyGuessVote: handleSpyGuessVote,
    onSpyGuessFinished: handleSpyGuessFinished,
    onSpyGuessAutoWinAcked: handleSpyGuessAutoWinAcked,
    onSpyGuessAllVoted: handleSpyGuessAllVoted,
    onReaction: (payload) => reactions?.addReaction(payload),
  });

  const sendReactionRef = useRef(sendReaction);
  sendReactionRef.current = sendReaction;

  const sendReactionWithSelf = useCallback(
    (reactionId: number) => {
      if (currentPlayerId) reactions?.addReaction({ playerId: currentPlayerId, reactionId });
      sendReactionRef.current(reactionId);
    },
    [currentPlayerId, reactions]
  );

  useEffect(() => {
    reactions?.registerSendReaction(sendReactionWithSelf);
    return () => reactions?.registerSendReaction(() => {});
  }, [reactions, sendReactionWithSelf]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1270px)');
    const update = () => setIsMobileLayout(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

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
        setSelectedVoteTarget(null);
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

  async function castSkip() {
    if (!roomId || !currentPlayerId) return;

    try {
      const response = await fetch('/api/game/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, voterId: currentPlayerId, skip: true }),
      });

      if (response.ok) {
        setMySkipped(true);
        setSelectedVoteTarget(null);
        console.log('✅ My vote: skip');
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка голосования');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  async function handleTimeExpire() {
    if (expiredHandled.current) return;
    expiredHandled.current = true;
    console.log('⏰ Time expired! Starting final vote...');
    if (!roomId) return;
    try {
      const res = await fetch('/api/game/vote/start-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Start final voting error:', data.error);
      }
    } catch (err) {
      console.error('Start final voting error:', err);
    }
  }

  async function submitSpyGuess(locationName: string) {
    if (!roomId || !currentPlayerId) return;
    try {
      const res = await fetch('/api/game/spy-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId: currentPlayerId, guessText: locationName }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  async function submitSpyKill(targetId: string) {
    if (!roomId || !currentPlayerId) return;
    try {
      const res = await fetch('/api/game/spy-kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, spyId: currentPlayerId, targetId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Ошибка устранения');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка устранения');
    }
  }

  const handleSpyGuessAutoWinClose = useCallback(async () => {
    if (!roomId) return;
    try {
      await fetch('/api/game/spy-guess/ack-auto-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      setShowSpyWinByGuess(true);
    } catch (e) {
      console.error('Ack auto-win failed:', e);
    }
  }, [roomId]);

  async function castSpyGuessVote(vote: 'yes' | 'no') {
    if (!roomId || !currentPlayerId) return;
    try {
      const res = await fetch('/api/game/spy-guess/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId: currentPlayerId, vote }),
      });
      if (res.ok) setSpyGuessMyVote(vote);
      else {
        const data = await res.json();
        alert(data.error || 'Ошибка');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка');
    }
  }

  if (loading) {
    return <FullscreenLoader show={true} />;
  }
  if (!gameData) {
    return (
      <>
        <FullscreenLoader show={false} />
        <div className={styles.loadingWrap}>
          <p className={styles.loadingText}>Ошибка загрузки</p>
        </div>
      </>
    );
  }

  const alivePlayers = players.filter((p) => p.is_alive);
  const isAlive = gameData.isAlive;
  const showTheme = gameData.settings.mode_theme;
  const showRole = gameData.settings.mode_roles;

  const mainLayout = isMobileLayout ? (
    <div className={styles.mobileRoot}>
      <div className={styles.mobileFixedTop}>
        <div className={`glass ${styles.mobileHeader}`}>
          <span className={styles.mobileHeaderTitle}>Игроки</span>
          <GameTimerTop
            endsAt={currentEndsAt || gameData.endsAt}
            onExpire={handleTimeExpire}
            isPaused={isGamePaused}
            remainingMsWhenPaused={isGamePaused ? remainingTimeMs : null}
            variant="inline"
          />
        </div>
        <div className={styles.mobilePlayerListWrap}>
          <PlayerList
            layout="game"
            players={players}
            currentPlayerId={currentPlayerId}
            onlinePlayers={onlinePlayers}
            isHost={false}
            eliminatedPlayerIds={new Set(
              players
                .filter((p: { is_alive?: boolean }) => p.is_alive === false)
                .map((p) => p.id),
            )}
          />
        </div>
      </div>

      <div className={styles.mobileScroll}>
        <div className={styles.mobileModes}>
          <div className={`glass ${styles.mobileModeCard}`}>
            <GameModeCard
              noGlass
              variant="theme"
              value={showTheme ? (gameData.theme || '') : ''}
            />
          </div>
          {gameData.isSpy ? (
            <div className={styles.mobileSpyBlock}>
              <GameSpyBlock
                onGuess={submitSpyGuess}
                modeHiddenThreat={!!gameData.settings.mode_hidden_threat}
                players={players}
                onEliminate={submitSpyKill}
                spyActionType={gameData.spyActionType ?? null}
                killUnlockAt={gameData.killUnlockAt ?? null}
              />
            </div>
          ) : (
            <>
              <div className={`glass ${styles.mobileModeCard}`}>
                <GameModeCard
                  noGlass
                  variant="location"
                  value={gameData.locationName}
                />
              </div>
              <div className={`glass ${styles.mobileModeCard}`}>
                <GameModeCard
                  noGlass
                  variant="role"
                  value={showRole && gameData.myRole ? gameData.myRole : ''}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.mobileImageWrap}>
          <div className={styles.mobileImageInner}>
            <GameLocationImage imageKey={gameData.imageKey} isSpy={gameData.isSpy} />
          </div>
        </div>

        <div className={styles.mobileEarlyVote}>
          <GameEarlyVoteBlock
            isActive={wantsEarlyVote}
            onToggle={toggleEarlyVote}
            disabled={togglingVote || !isAlive}
            current={earlyVoteCount}
            total={alivePlayers.length}
            spectator={!isAlive}
            usedCount={earlyVoteUsedCount}
            availableAt={earlyVoteAvailableAt}
            isGamePaused={isGamePaused}
          />
        </div>
      </div>

      <FooterBar
        variant="game"
        leftSlot={<GameHintButton gameId={gameId} />}
        isHost={isHost}
        onHostPanelClick={() => setHostPanelOpen(true)}
      />
    </div>
  ) : (
    <div className={styles.contentGrid}>
      {/* COL1: Тема, список игроков, подсказка вопросов */}
      <div className={styles.leftCol}>
        <div className={`glass ${styles.glassBlock} ${styles.glassBlockCard}`}>
          <GameModeCard
            noGlass
            variant="theme"
            value={showTheme ? (gameData.theme || '') : ''}
          />
        </div>
        <div className={styles.playerListWrap}>
          <PlayerList
            layout="game"
            players={players}
            currentPlayerId={currentPlayerId}
            onlinePlayers={onlinePlayers}
            isHost={false}
            eliminatedPlayerIds={new Set(players.filter((p: { is_alive?: boolean }) => p.is_alive === false).map((p) => p.id))}
          />
        </div>
        <div className={styles.timerWrap}>
          <GameHintQuestionBlock gameId={gameId} />
        </div>
      </div>

      {/* COL2: ЛОКАЦИЯ/РОЛЬ или блок шпиона, картинка, досрочное голосование */}
      <div className={styles.rightCol}>
        <div
          className={`${styles.modeCardsRow} ${gameData.isSpy ? styles.modeCardsRowSingle : ''}`}
        >
          {gameData.isSpy ? (
            <GameSpyBlock
              onGuess={submitSpyGuess}
              modeHiddenThreat={!!gameData.settings.mode_hidden_threat}
              players={players}
              onEliminate={submitSpyKill}
              spyActionType={gameData.spyActionType ?? null}
              killUnlockAt={gameData.killUnlockAt ?? null}
            />
          ) : (
            <>
              <GameModeCard
                variant="location"
                value={gameData.locationName}
              />
              <GameModeCard
                variant="role"
                value={showRole && gameData.myRole ? gameData.myRole : ''}
              />
            </>
          )}
        </div>
        <div className={styles.imagePlaceholderWrap}>
          <GameTimerTop
            endsAt={currentEndsAt || gameData.endsAt}
            onExpire={handleTimeExpire}
            isPaused={isGamePaused}
            remainingMsWhenPaused={isGamePaused ? remainingTimeMs : null}
          />
          <GameLocationImage imageKey={gameData.imageKey} isSpy={gameData.isSpy} />
        </div>
        <div className={styles.earlyVoteWrap}>
          <GameEarlyVoteBlock
            isActive={wantsEarlyVote}
            onToggle={toggleEarlyVote}
            disabled={togglingVote || !isAlive}
            current={earlyVoteCount}
            total={alivePlayers.length}
            spectator={!isAlive}
            usedCount={earlyVoteUsedCount}
            availableAt={earlyVoteAvailableAt}
            isGamePaused={isGamePaused}
          />
        </div>
      </div>

      {isHost && (
        <GameHostButtons
          onPause={pauseGame}
          onEndGame={endGame}
          isPaused={isGamePaused}
          pausingGame={pausingGame}
        />
      )}
    </div>
  );

  return (
    <>
      <FullscreenLoader show={showLoader} />
      {mainLayout}

      <AnimatePresence>
        {gameSplashEvent?.type === 'system_pause' && (
          <SplashScreen
            key="system_pause"
            type="system_pause"
            showContinueButton={isHost}
            onClose={resumeGame}
          />
        )}
        {gameSplashEvent?.type === 'spy_kill' && (() => {
          const targetId = (gameSplashEvent as { target_id?: string }).target_id;
          const killed = targetId ? players.find((p) => p.id === targetId) : null;
          return (
            <SplashScreen
              key="spy_kill"
              type="spy_kill"
              countdownSeconds={gameSplashEvent.countdownSeconds ?? 5}
              countdownLabel={gameSplashEvent.countdownLabel ?? 'Игра продолжается'}
              eventAt={gameSplashEvent.at}
              endsAt={gameSplashEvent.ends_at}
              eliminatedPlayer={killed ? { nickname: killed.nickname, avatar_id: killed.avatar_id, role: killed.role ?? undefined } : undefined}
              onClose={async () => {
                if (roomId) {
                  try {
                    await fetch('/api/game/splash/clear', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ roomId }),
                    });
                  } catch (e) {
                    console.error('Splash clear failed:', e);
                  }
                }
              }}
            />
          );
        })()}
        {votingResult && showIntermediateResult && votingResult.type === 'eliminated' && votingResult.eliminatedId && (() => {
          const eliminatedId = kickedSplashKeyRef.current ?? votingResult.eliminatedId;
          const eliminated = players.find((p) => p.id === (votingResult.eliminatedId ?? eliminatedId));
          if (!eliminated) return null;
          const splashKey = `voting_eliminated_${eliminatedId}`;
          const voteCounts = (votingResult.voteCounts ?? {}) as Record<string, number>;
          const totalVotes = Object.values(voteCounts).reduce((a: number, b: number) => a + b, 0);
          const percent = totalVotes > 0 && votingResult.eliminatedId
            ? Math.round((100 * (voteCounts[votingResult.eliminatedId] ?? 0)) / totalVotes)
            : undefined;
          const aliveCount = players.filter((p) => p.is_alive).length;
          const eliminatedStillInAliveCount = eliminated?.is_alive === true;
          const remainingAfterExile = eliminatedStillInAliveCount ? aliveCount - 1 : aliveCount;
          const gameEnding = votingResult.wasSpy || remainingAfterExile < 3 || votingResult.isFinal;
          const countdownLabel = gameEnding ? 'Игра завершена...' : 'Игра продолжается...';
          const splashEv =
            gameSplashEvent?.type === 'voting_kicked_civilian' || gameSplashEvent?.type === 'voting_final_transition'
              ? (gameSplashEvent as { at?: string; ends_at?: string; exile_ends_at?: string })
              : null;
          return (
            <SplashScreen
              key={splashKey}
              type="voting_kicked_civilian"
              onClose={handleIntermediateResultClose}
              countdownSeconds={10}
              countdownLabel={countdownLabel}
              eventAt={splashEv?.at}
              endsAt={splashEv?.ends_at ?? splashEv?.exile_ends_at}
              eliminatedPlayer={{ nickname: eliminated.nickname, avatar_id: eliminated.avatar_id, role: eliminated.role ?? undefined }}
              eliminatedWasSpy={votingResult.wasSpy}
              eliminatedVotePercent={percent}
            />
          );
        })()}
        {votingResult && showFinalResult && (votingResult.type === 'eliminated' && votingResult.isFinal || votingResult.type === 'final_civilians_lose') && (
          <SplashScreen
            key="game_over"
            type={votingResult.winner === 'civilians' ? 'game_over_civilians_win' : 'game_over_spy_win_voting'}
            players={players}
            spyIds={gameData.spyIds}
            showContinueButton={isHost}
            onClose={finishGameAndReturnToRoom}
          />
        )}
        {showSpyWinByGuess && (
          <SplashScreen
            key="game_over_spy_guess"
            type="game_over_spy_win"
            players={players}
            spyIds={gameData.spyIds}
            showContinueButton={isHost}
            onClose={finishGameAndReturnToRoom}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {spyGuessStatus === 'auto_win' && spyGuessText && spyGuessEndsAt && (
          <SpyGuessSplash
            key="spy-guess-autowin"
            title="ШПИОН УГАДАЛ ?"
            countdownLabel="Игра завершена..."
            endsAt={spyGuessEndsAt}
            onClose={handleSpyGuessAutoWinClose}
          >
            <SpyGuessAutoWinContent guessText={spyGuessText} />
          </SpyGuessSplash>
        )}
        {spyGuessStatus === 'voting' && spyGuessText && (
          <SpyGuessSplash
            key="spy-guess-vote"
            title="ШПИОН УГАДАЛ ?"
            countdownLabel="ВЫБЕРИТЕ ОТВЕТ..."
            endsAt={spyGuessEndsAt ?? undefined}
            onClose={handleSpyGuessVoteTimeExpired}
          >
            <SpyGuessVoteContent
              guessText={spyGuessText}
              yesCount={spyGuessYesCount}
              noCount={spyGuessNoCount}
              eligibleCount={alivePlayers.filter((p) => !p.is_spy).length}
              myVote={spyGuessMyVote}
              isSpy={gameData.isSpy}
              onVote={castSpyGuessVote}
            />
          </SpyGuessSplash>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!votingClosedByRealtime && (votingStatus === 'active' || splashExiting) && (
          <VotingSplash
            key={`voting-splash-${serverVotingPhase === 'revote' ? 'revote' : 'main'}-${serverVotingType ?? 'early'}`}
            title={
              serverVotingType === 'final'
                ? 'Кто шпион?'
                : 'Голосование'
            }
            titleBadge={serverVotingPhase === 'revote' ? 'РАУНД 2' : undefined}
            countdownLabel="ОСТАЛОСЬ..."
            colors={serverVotingType === 'final' ? { front: '#E8955C', back: '#C4783D' } : undefined}
            endsAt={(serverVotingPhase === 'collecting' || serverVotingPhase === 'revote') ? (serverVotingEndsAt ?? votingEndsAt ?? undefined) : undefined}
            onClose={handleVotingTimeExpired}
            resultCountdown={(votingPhase === 'result_no_vote' || votingPhase === 'revote_result_no_vote' || votingPhase === 'result_tie') ? resultCountdown : undefined}
            resultCountdownLabel={
              votingPhase === 'result_no_vote' || votingPhase === 'revote_result_no_vote'
                ? 'Игра продолжается...'
                : votingPhase === 'result_tie'
                  ? 'Продолжение..'
                  : undefined
            }
          >
            {(() => {
              const isSpectator = !isAlive;
              const isRevote = serverVotingPhase === 'revote';
              const displayPlayers = alivePlayers;
              const candidateIds = isRevote ? serverRevoteCandidates : null;
              const isCandidate = isRevote && currentPlayerId && serverRevoteCandidates.includes(currentPlayerId);
              const hasVoted = myVote !== null || mySkipped || (isRevote && isCandidate);
              const votedCountDisplay = isRevote && serverRevoteCandidates?.length
                ? new Set([...votedPlayers, ...serverRevoteCandidates]).size
                : votedPlayers.size;

              if (
                (votingPhase === 'result_no_vote' || votingPhase === 'revote_result_no_vote' ||
                  serverVotingPhase === 'result_no_vote' || serverVotingPhase === 'revote_result_no_vote') &&
                serverVotingType !== 'final'
              ) {
                return (
                  <div className={votingSplashStyles.votingCenter}>
                    <p className={votingSplashStyles.votingNoResult}>Голосование не состоялось</p>
                  </div>
                );
              }

              if (votingPhase === 'result_tie' && votingResult?.candidates) {
                const voteCounts = (votingResult.voteCounts ?? {}) as Record<string, number>;
                const totalVotes = Object.values(voteCounts).reduce((a: number, b: number) => a + b, 0);
                type TieRow = { player: (typeof players)[number]; percent: number };
                const two = votingResult.candidates
                  .slice(0, 2)
                  .map((id: string) => {
                    const p = players.find((pl) => pl.id === id);
                    const votes = totalVotes > 0 ? (voteCounts[id] ?? 0) : 0;
                    const percent = totalVotes > 0 ? Math.round((100 * votes) / totalVotes) : 0;
                    return p ? { player: p, percent } : null;
                  })
                  .filter((x: TieRow | null): x is TieRow => x != null);
                return (
                  <div className={votingSplashStyles.votingCenter}>
                    <p className={votingSplashStyles.votingMostVotes}>Кандидаты на повторное голосование</p>
                    <div className={votingSplashStyles.votingResultTwo}>
                      {two.map(({ player, percent }: TieRow) => (
                        <VotingCard
                          key={player.id}
                          player={player}
                          isMe={player.id === currentPlayerId}
                          isHost={!!player.is_host}
                          hasVoted={false}
                          selected={false}
                          disabled
                          onSelect={() => { }}
                          percentLabel={`${percent}%`}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div className={votingSplashStyles.votingCenter}>
                  {isSpectator && (
                    <p className={votingSplashStyles.votingSpectator}>Вы изгнаны. Наблюдаете за голосованием.</p>
                  )}
                  <div className={votingSplashStyles.votingList}>
                    {displayPlayers.map((player) => {
                      const isSelf = player.id === currentPlayerId;
                      const dimmed = isSelf || (isRevote && candidateIds != null && !candidateIds.includes(player.id));
                      const disabled = dimmed || hasVoted || (isCandidate && isSelf) || isSpectator;
                      return (
                        <VotingCard
                          key={player.id}
                          player={player}
                          isMe={isSelf}
                          isHost={!!player.is_host}
                          hasVoted={votedPlayers.has(player.id) || (isRevote && serverRevoteCandidates.includes(player.id))}
                          selected={!isSelf && selectedVoteTarget === player.id}
                          disabled={disabled}
                          onSelect={() => !disabled && !isSelf && setSelectedVoteTarget(selectedVoteTarget === player.id ? null : player.id)}
                          dimmed={dimmed}
                        />
                      );
                    })}
                  </div>
                  {isSpectator ? (
                    <p className={votingSplashStyles.votingDone}>
                      Проголосовало: {votedCountDisplay} / {displayPlayers.length}
                    </p>
                  ) : hasVoted ? (
                    <p className={votingSplashStyles.votingDone}>
                      Голос учтён. Проголосовало: {votedCountDisplay} / {displayPlayers.length}
                    </p>
                  ) : (
                    <div className={votingSplashStyles.votingActions}>
                      {serverVotingType !== 'final' && (
                        <motion.button
                          type="button"
                          className={`glass glass-hover ${votingSplashStyles.skipBtn}`}
                          onClick={() => { playUI('click'); castSkip(); }}
                          onMouseEnter={() => playUI('hover')}
                          whileTap={{ scale: 0.97 }}
                          transition={{ duration: 0.08 }}
                        >
                          ПРОПУСТИТЬ
                        </motion.button>
                      )}
                      <motion.button
                        type="button"
                        className={votingSplashStyles.voteBtn}
                        onClick={() => {
                          if (selectedVoteTarget) {
                            playUI('click');
                            castVote(selectedVoteTarget);
                          }
                        }}
                        onMouseEnter={() => playUI('hover')}
                        disabled={!selectedVoteTarget || (isRevote && !!selectedVoteTarget && !serverRevoteCandidates.includes(selectedVoteTarget))}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.08 }}
                      >
                        ПРОГОЛОСОВАТЬ
                      </motion.button>
                    </div>
                  )}
                </div>
              );
            })()}
          </VotingSplash>
        )}
      </AnimatePresence>

      {votingResult && showIntermediateResult && votingResult.type === 'tie_failed' && (
        <VotingIntermediateResult
          isOpen={showIntermediateResult}
          result={votingResult}
          players={players}
          onClose={handleIntermediateResultClose}
          countdownSeconds={10}
        />
      )}

      <AnimatePresence>
        {hostPanelOpen && isHost && (
          <motion.div
            className={styles.hostPanelBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={styles.hostPanelCloseArea}
              onClick={() => setHostPanelOpen(false)}
              aria-hidden
            />
            <motion.div
              className={styles.hostPanelContent}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={styles.hostPanelTitle}>ПАНЕЛЬ ВЕДУЩЕГО</h2>
              <div className={styles.hostPanelActions}>
                <button
                  type="button"
                  className={`glass glass-hover ${styles.hostPanelButton}`}
                  onMouseEnter={() => playUI('hover')}
                  onClick={() => {
                    playUI('click');
                    if (isGamePaused) {
                      resumeGame();
                    } else {
                      pauseGame();
                    }
                    setHostPanelOpen(false);
                  }}
                >
                  {isGamePaused ? 'Возобновить игру' : 'Пауза игры'}
                </button>
                <button
                  type="button"
                  className={`glass glass-hover ${styles.hostPanelButton}`}
                  onClick={() => {
                    playUI('click');
                    setHostPanelOpen(false);
                    setEndGameConfirmOpen(true);
                  }}
                  onMouseEnter={() => playUI('hover')}
                >
                  Завершить игру
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={endGameConfirmOpen}
        onClose={() => setEndGameConfirmOpen(false)}
        question="Вы хотите завершить игру?"
        onConfirm={() => {
          setEndGameConfirmOpen(false);
          endGame();
        }}
      />
    </>
  );
}