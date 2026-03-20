'use client';

import { useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconShare, IconMoodSmile } from '@tabler/icons-react';
import { useReactions } from '@/contexts/ReactionsContext';
import { LobbyInviteBlock } from '@/components/room/LobbyInviteBlock';
import { HostPanelPlayerList } from '@/components/room/HostPanelPlayerList';
import { PrimaryButtonLobby } from '@/components/ui/PrimaryButtonLobby';
import { DangerButtonLobby } from '@/components/ui/DangerButtonLobby';
import { useLobbyFooter } from '@/contexts/LobbyFooterContext';
import { playUI } from '@/lib/sound';
import styles from './FooterBar.module.css';

export type FooterBarVariant = 'lobby' | 'game';

type FooterBarProps = {
  variant: FooterBarVariant;
  inviteCode?: string;
  /** Для variant='game': контент левой ячейки (кнопка подсказки). */
  leftSlot?: ReactNode;
  /** Для variant='game': показывать кнопку «Панель ведущего». */
  isHost?: boolean;
  /** Для variant='game': по клику открыть панель ведущего. */
  onHostPanelClick?: () => void;
};

export function FooterBar({
  variant,
  inviteCode,
  leftSlot,
  isHost: isHostProp,
  onHostPanelClick,
}: FooterBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const lobby = useLobbyFooter();
  const reactions = useReactions();
  const reactionsButtonRef = useRef<HTMLButtonElement>(null);

  const isHostLobby = lobby?.isHost ?? false;
  const isHost = variant === 'game' ? (isHostProp ?? false) : isHostLobby;

  return (
    <>
      <footer className={styles.root} data-footer-variant={variant}>
        <div className={styles.leftSlot}>
          {variant === 'lobby' && (
            <motion.button
              type="button"
              className={`${styles.iconButton} glass glass-hover`}
              onClick={() => {
                playUI('click');
                setShareOpen(true);
              }}
              onMouseEnter={() => playUI('hover')}
              aria-label="Поделиться"
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.08 }}
            >
              <span className={styles.icon} aria-hidden>
                <IconShare size={28} stroke={2} />
              </span>
            </motion.button>
          )}
          {variant === 'game' && leftSlot != null && (
            <div className={styles.leftSlotGame}>{leftSlot}</div>
          )}
        </div>

        <div className={styles.centerSlot}>
          {variant === 'lobby' && isHost && (
            <motion.button
              type="button"
              className={`${styles.centerTextButton} glass glass-hover`}
              onClick={() => {
                playUI('click');
                setHostPanelOpen(true);
              }}
              onMouseEnter={() => playUI('hover')}
              aria-label="Панель ведущего"
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.08 }}
            >
              Панель управления
            </motion.button>
          )}
          {variant === 'game' && isHost && onHostPanelClick && (
            <motion.button
              type="button"
              className={`${styles.centerTextButton} glass glass-hover`}
              onClick={() => {
                playUI('click');
                onHostPanelClick();
              }}
              onMouseEnter={() => playUI('hover')}
              aria-label="Панель ведущего"
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.08 }}
            >
              Панель ведущего
            </motion.button>
          )}
        </div>

        <div className={styles.rightSlot}>
          <motion.button
            ref={reactionsButtonRef}
            type="button"
            className={`${styles.iconButton} glass glass-hover`}
            onClick={() => {
              playUI('click');
              if (reactions && reactionsButtonRef.current) {
                reactions.openReactions(reactionsButtonRef.current.getBoundingClientRect());
              }
            }}
            onMouseEnter={() => playUI('hover')}
            aria-label="Реакции"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.08 }}
          >
            <span className={styles.icon} aria-hidden>
              <IconMoodSmile size={28} stroke={2} />
            </span>
          </motion.button>
        </div>
      </footer>

      {/* Share overlay */}
      <AnimatePresence>
        {shareOpen && variant === 'lobby' && inviteCode && (
          <motion.div
            className={styles.overlayBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={styles.overlayCloseArea}
              onClick={() => setShareOpen(false)}
              aria-hidden
            />
            <motion.div
              className={styles.overlayContent}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LobbyInviteBlock code={inviteCode} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host panel overlay */}
      <AnimatePresence>
        {hostPanelOpen && variant === 'lobby' && lobby && (
          <motion.div
            className={styles.overlayBackdropHost}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={styles.overlayCloseArea}
              onClick={() => setHostPanelOpen(false)}
              aria-hidden
            />
            <motion.div
              className={styles.overlayContentHost}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className={styles.hostPanelActions}>
                <PrimaryButtonLobby
                  className={styles.hostPanelBtn}
                  disabled={lobby.startingGame || lobby.players.length < 3}
                  loading={lobby.startingGame}
                  lottieIcon="/lottie/rocet.json"
                  onClick={() => { lobby.onStartGame(); setHostPanelOpen(false); }}
                  soundClick="click"
                  soundHover="hover"
                >
                  {lobby.startingGame ? 'Запуск...' : 'СТАРТ ИГРЫ'}
                </PrimaryButtonLobby>
              </div>
              <div className={styles.hostPanelList}>
                <HostPanelPlayerList
                  players={lobby.players}
                  currentPlayerId={lobby.currentPlayerId}
                  isHost={lobby.isHost}
                  onKick={lobby.onKick}
                  kickingPlayerId={lobby.kickingPlayerId}
                />
              </div>
              <div className={styles.hostPanelActions}>
                <DangerButtonLobby
                  className={styles.hostPanelBtn}
                  onClick={() => { lobby.onCloseRoom(); setHostPanelOpen(false); }}
                  soundClick="click"
                  soundHover="hover"
                >
                  ЗАКРЫТЬ КОМНАТУ
                </DangerButtonLobby>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
