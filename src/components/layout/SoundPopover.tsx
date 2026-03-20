'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconVolume, IconVolume2, IconVolume3 } from '@tabler/icons-react';
import { useSoundStore, type SoundLayer } from '@/store/sound-store';
import {
  playUI,
  syncMusicVolume,
  skipAuthPrev,
  skipAuthNext,
  skipLobbyPrev,
  skipLobbyNext,
  skipGamePrev,
  skipGameNext,
} from '@/lib/sound';
import styles from './SoundPopover.module.css';

/** Volume4 from Tabler (inline SVG — package icon is empty) */
function IconVolume4({
  size = 24,
  stroke = 2,
  className,
}: {
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path stroke="none" d="M0 0h24v24H0z" />
      <path d="M9.5 15h-2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2L13 4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L9.5 15" />
    </svg>
  );
}

type SoundPopoverProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  debugContext?: 'auth' | 'lobby' | 'game';
};

const LAYERS: { id: SoundLayer; label: string }[] = [
  { id: 'ui', label: 'UI' },
  { id: 'vfx', label: 'VFX' },
  { id: 'music', label: 'Music' },
];

export function SoundPopover({ open, onClose, anchorRef, debugContext }: SoundPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const showDebugControls = process.env.NEXT_PUBLIC_SOUND_DEBUG === 'true';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const pop = popoverRef.current;
      if (pop?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          className={`${styles.popover} glass`}
          role="dialog"
          aria-label="Sound settings"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className={styles.sectionTitle}>Настройка звука</p>
          {LAYERS.map(({ id, label }) => (
            <LayerRow key={id} layer={id} label={label} />
          ))}
          {debugContext && showDebugControls && (
            <div className={styles.debugRow}>
              <span className={styles.debugLabel}>
                {debugContext === 'auth'
                  ? 'Debug (auth)'
                  : debugContext === 'lobby'
                    ? 'Debug (lobby)'
                    : 'Debug (game)'}
              </span>
              <div className={styles.debugButtons}>
                <button
                  type="button"
                  className={`${styles.debugBtn} glass glass-hover`}
                  onClick={() => {
                    playUI('click');
                    if (debugContext === 'auth') skipAuthPrev();
                    else if (debugContext === 'lobby') skipLobbyPrev();
                    else skipGamePrev();
                  }}
                  onMouseEnter={() => playUI('hover')}
                  title="Previous track"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className={`${styles.debugBtn} glass glass-hover`}
                  onClick={() => {
                    playUI('click');
                    if (debugContext === 'auth') skipAuthNext();
                    else if (debugContext === 'lobby') skipLobbyNext();
                    else skipGameNext();
                  }}
                  onMouseEnter={() => playUI('hover')}
                  title="Next track"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LayerRow({ layer, label }: { layer: SoundLayer; label: string }) {
  const { volume, muted } = useSoundStore((s) => s[layer]);
  const setVolume = useSoundStore((s) => s.setVolume);
  const setMuted = useSoundStore((s) => s.setMuted);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(layer, v);
    setMuted(layer, v === 0);
    if (layer === 'music') syncMusicVolume();
  };

  const handleMuteClick = () => {
    setVolume(layer, 0);
    setMuted(layer, true);
    if (layer === 'music') syncMusicVolume();
    playUI('click');
  };

  const handleSliderRelease = () => {
    if (layer === 'ui') playUI('tick');
  };

  const vol = muted ? 0 : volume;
  const iconKey =
    vol <= 0 ? 'mute' : vol <= 1 / 3 ? 'low' : vol <= 2 / 3 ? 'mid' : 'high';
  const VolumeIcon =
    vol <= 0
      ? IconVolume3
      : vol <= 1 / 3
        ? IconVolume4
        : vol <= 2 / 3
          ? IconVolume2
          : IconVolume;

  return (
    <div className={`${styles.row} ${vol === 0 ? styles.rowMuted : ''}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.controls}>
        <div className={styles.sliderWrap}>
          <div className={styles.track}>
            <div
              className={styles.trackFilled}
              style={{ width: `${vol * 100}%` }}
              aria-hidden
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vol}
            onChange={handleVolumeChange}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className={styles.slider}
            aria-label={`Volume ${label}`}
          />
        </div>
        <button
          type="button"
          onClick={handleMuteClick}
          className={`${styles.muteBtn} glass glass-hover`}
          aria-label={vol === 0 ? `Unmute ${label}` : `Mute ${label}`}
          title={vol === 0 ? 'Unmute' : 'Mute'}
          onMouseEnter={() => playUI('hover')}
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={iconKey}
              className={styles.muteIconLayer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <VolumeIcon size={22} stroke={2} className={styles.muteIcon} />
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
