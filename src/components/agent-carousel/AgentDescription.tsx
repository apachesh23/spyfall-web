'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AgentAvatar as Avatar } from '@/lib/avatars';
import { playUI } from '@/lib/sound';
import styles from './Agent.module.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const WORD = 'RANDOM';
const TOTAL_FRAMES = 12;
const LETTER_HEIGHT_PX = 36;

const getRandomChar = () =>
  ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

type SpinningLetterProps = {
  letter: string;
  index: number;
  trigger: number;
  durationSec: number;
};

function SpinningLetter({ letter, index, trigger, durationSec }: SpinningLetterProps) {
  const [sequence, setSequence] = useState<string[]>([letter]);

  useEffect(() => {
    if (trigger > 0) {
      const randoms = Array.from({ length: TOTAL_FRAMES - 2 }, getRandomChar);
      setSequence([letter, ...randoms, letter]);
    }
  }, [trigger, letter]);

  const endY = trigger === 0 ? 0 : -(LETTER_HEIGHT_PX * (sequence.length - 1));

  return (
    <div className={styles.agentDescriptionSlotWrap} aria-hidden>
      <motion.div
        key={trigger}
        className={styles.agentDescriptionSlotStrip}
        style={{ height: LETTER_HEIGHT_PX * sequence.length }}
        initial={{ y: 0 }}
        animate={{ y: endY }}
        transition={{
          duration: trigger === 0 ? 0 : durationSec,
          ease: [0.3, 0.5, 0, 1],
          delay: index * Math.min(0.08, durationSec * 0.08),
        }}
      >
        {sequence.map((char, i) => (
          <div key={i} className={styles.agentDescriptionSlotCell}>
            {char}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

type AgentDescriptionProps = {
  agent: Avatar | null;
  onRandomClick: () => void;
  randomDisabled: boolean;
  /** Длительность прокрутки в мс — под неё подстраиваем таймлайн анимации букв */
  randomRollDuration?: number;
};

export function AgentDescription({
  agent,
  onRandomClick,
  randomDisabled,
  randomRollDuration = 0,
}: AgentDescriptionProps) {
  const name = agent?.name ?? 'Неизвестный агент';
  const description = agent?.description ?? 'Информация отсутствует';

  const [rollTrigger, setRollTrigger] = useState(0);
  useEffect(() => {
    if (randomRollDuration > 0) setRollTrigger((t) => t + 1);
  }, [randomRollDuration]);

  const durationSec = (randomRollDuration || 800) / 1000;

  return (
    <div className={styles.agentDescriptionWrap}>
      <div className={styles.agentDescriptionRandomButtonWrap}>
        <motion.button
          type="button"
          onClick={() => {
            playUI('click');
            onRandomClick();
          }}
          onMouseEnter={() => !randomDisabled && playUI('hover')}
          disabled={randomDisabled}
          className={`${styles.agentDescriptionRandomButton} glass`}
          aria-label="Случайный агент"
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.08 }}
        >
          {WORD.split('').map((char, i) => (
            <SpinningLetter
              key={`${rollTrigger}-${i}`}
              letter={char}
              index={i}
              trigger={rollTrigger}
              durationSec={durationSec}
            />
          ))}
        </motion.button>
      </div>

      <div className={`${styles.agentDescriptionCard} glass`}>
        <div className={styles.agentDescriptionHeader}>
          <div className={styles.agentDescriptionTitleWrap}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#747BFF"
              className={styles.agentDescriptionIcon}
              aria-hidden
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <h2 className={styles.agentDescriptionTitle}>{name}</h2>
          </div>
        </div>
        <div className={styles.agentDescriptionTextWrap}>
          <p className={styles.agentDescriptionText}>{description}</p>
        </div>
      </div>
    </div>
  );
}

