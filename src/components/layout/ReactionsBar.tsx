'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { playUI } from '@/lib/sound';
import { useReactions } from '@/contexts/ReactionsContext';
import { useIsLobbyMobile } from '@/hooks/room/useIsLobbyMobile';
import styles from './ReactionsBar.module.css';

const REACTION_COUNT = 10;
const REACTION_PATHS = Array.from(
  { length: REACTION_COUNT },
  (_, i) => `/lottie/reactions/reaction${i + 1}.json`
);

function ReactionItems({
  hoveredIndex,
  onHoverChange,
  onSelectReaction,
  itemClassName,
  iconWrapClassName,
  iconSize = 60,
}: {
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
  onSelectReaction?: (reactionId: number) => void;
  itemClassName: string;
  iconWrapClassName: string;
  iconSize?: number;
}) {
  return (
    <>
      {REACTION_PATHS.map((src, index) => (
        <button
          key={src}
          type="button"
          className={itemClassName}
          onMouseEnter={() => {
            onHoverChange(index);
            playUI('hover');
          }}
          onMouseLeave={() => onHoverChange(null)}
          onTouchStart={() => {
            onHoverChange(index);
            playUI('hover');
          }}
          onClick={() => {
            playUI('click');
            onSelectReaction?.(index + 1);
          }}
          aria-label={`Реакция ${index + 1}`}
        >
          <span className={iconWrapClassName}>
            <LottieIcon
              src={src}
              playOnHover
              hovered={hoveredIndex === index}
              size={iconSize}
            />
          </span>
        </button>
      ))}
    </>
  );
}

export function ReactionsBar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const reactions = useReactions();
  const isMobile = useIsLobbyMobile();
  const showMobileOverlay = Boolean(mounted && isMobile && reactions?.mobileOpen && reactions.triggerRect);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showMobileOverlay) setHoveredIndex(null);
  }, [showMobileOverlay]);

  const flyoutStyle =
    showMobileOverlay && reactions?.triggerRect && typeof window !== 'undefined'
      ? {
          bottom: `${window.innerHeight - reactions.triggerRect.top + 8}px`,
          left: `${reactions.triggerRect.left + (reactions.triggerRect.width - 48) / 2}px`,
        }
      : undefined;

  const handleSelectReaction = (reactionId: number) => {
    reactions?.sendReaction(reactionId);
    if (isMobile) reactions?.closeReactions();
  };

  return (
    <>
      <aside className={styles.bar} aria-label="Реакции">
        <ReactionItems
          hoveredIndex={hoveredIndex}
          onHoverChange={setHoveredIndex}
          onSelectReaction={handleSelectReaction}
          itemClassName={styles.item}
          iconWrapClassName={styles.iconWrap}
        />
      </aside>

      {mounted &&
        isMobile &&
        createPortal(
          <AnimatePresence>
            {reactions?.mobileOpen && reactions?.triggerRect && (
              <motion.div
                className={styles.mobileBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={styles.mobileCloseArea}
                  onClick={() => {
                    playUI('click');
                    reactions?.closeReactions();
                  }}
                  aria-hidden
                />
                <motion.div
                  className={styles.mobileFlyout}
                  style={flyoutStyle}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 24, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ReactionItems
                    hoveredIndex={hoveredIndex}
                    onHoverChange={setHoveredIndex}
                    onSelectReaction={handleSelectReaction}
                    itemClassName={styles.item}
                    iconWrapClassName={styles.iconWrap}
                    iconSize={48}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
