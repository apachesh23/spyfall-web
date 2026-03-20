'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

export type TriggerRect = { top: number; left: number; width: number; height: number };

/** Реакция, полученная по Realtime (кто и какую иконку отправил) */
export type ReactionPayload = { playerId: string; reactionId: number };

/** Активная реакция на аватарке (с id для ключа и таймера) */
export type ActiveReaction = { id: string; playerId: string; reactionId: number };

const REACTION_LIFETIME_MS = 3000;

/** Уникальный id без crypto.randomUUID (нет на части мобильных/небезопасных контекстов) */
function generateReactionId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID === 'function') {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type ReactionsContextValue = {
  mobileOpen: boolean;
  triggerRect: TriggerRect | null;
  openReactions: (rect: DOMRect | TriggerRect) => void;
  closeReactions: () => void;
  sendReaction: (reactionId: number) => void;
  registerSendReaction: (fn: (reactionId: number) => void) => void;
  /** Активные реакции (одна на игрока, живут 3 сек, потом удаляются) */
  activeReactions: ActiveReaction[];
  /** Вызвать при получении broadcast — добавляет реакцию и через 3 сек удаляет */
  addReaction: (payload: ReactionPayload) => void;
};

const ReactionsContext = createContext<ReactionsContextValue | null>(null);

export function ReactionsProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<TriggerRect | null>(null);
  const [activeReactions, setActiveReactions] = useState<ActiveReaction[]>([]);
  const sendReactionRef = useRef<(reactionId: number) => void>(() => {});
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  const openReactions = useCallback((rect: DOMRect | TriggerRect) => {
    const r = rect as DOMRect;
    setTriggerRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
    setMobileOpen(true);
  }, []);

  const closeReactions = useCallback(() => {
    setMobileOpen(false);
    setTriggerRect(null);
  }, []);

  const sendReaction = useCallback((reactionId: number) => {
    sendReactionRef.current(reactionId);
  }, []);

  const registerSendReaction = useCallback((fn: (reactionId: number) => void) => {
    sendReactionRef.current = fn;
  }, []);

  const addReaction = useCallback((payload: ReactionPayload) => {
    const id = generateReactionId();
    // Убираем предыдущую реакцию этого игрока и её таймер
    setActiveReactions((prev) => {
      prev.forEach((r) => {
        if (r.playerId === payload.playerId) {
          const t = timeoutsRef.current.get(r.id);
          if (t) {
            clearTimeout(t);
            timeoutsRef.current.delete(r.id);
          }
        }
      });
      return prev.filter((r) => r.playerId !== payload.playerId);
    });

    const newReaction: ActiveReaction = {
      id,
      playerId: payload.playerId,
      reactionId: payload.reactionId,
    };
    setActiveReactions((prev) => [...prev, newReaction]);

    const t = setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== id));
      timeoutsRef.current.delete(id);
    }, REACTION_LIFETIME_MS);
    timeoutsRef.current.set(id, t);
  }, []);

  return (
    <ReactionsContext.Provider
      value={{
        mobileOpen,
        triggerRect,
        openReactions,
        closeReactions,
        sendReaction,
        registerSendReaction,
        activeReactions,
        addReaction,
      }}
    >
      {children}
    </ReactionsContext.Provider>
  );
}

export function useReactions() {
  return useContext(ReactionsContext);
}
