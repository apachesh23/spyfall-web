'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Player } from '@/types/player';

type LobbyFooterContextValue = {
  isHost: boolean;
  players: Player[];
  currentPlayerId: string | null;
  onStartGame: () => void;
  onCloseRoom: () => void;
  onKick: (playerId: string) => void;
  startingGame: boolean;
  kickingPlayerId: string | null;
};

const LobbyFooterContext = createContext<LobbyFooterContextValue | null>(null);

export function LobbyFooterProvider({
  value,
  children,
}: {
  value: LobbyFooterContextValue;
  children: ReactNode;
}) {
  return (
    <LobbyFooterContext.Provider value={value}>
      {children}
    </LobbyFooterContext.Provider>
  );
}

export function useLobbyFooter() {
  return useContext(LobbyFooterContext);
}
