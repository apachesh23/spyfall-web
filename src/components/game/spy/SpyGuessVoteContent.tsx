'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { playUI } from '@/lib/sound';
import styles from './SpyGuessSplash.module.css';

const LOTTIE_YES = '/lottie/reactions/reaction1.json';
const LOTTIE_NO = '/lottie/reactions/reaction2.json';

type SpyGuessVoteContentProps = {
  guessText: string;
  yesCount: number;
  noCount: number;
  eligibleCount: number;
  myVote: 'yes' | 'no' | null;
  isSpy: boolean;
  onVote: (vote: 'yes' | 'no') => void;
};

export function SpyGuessVoteContent({
  guessText,
  yesCount,
  noCount,
  eligibleCount,
  myVote,
  isSpy,
  onVote,
}: SpyGuessVoteContentProps) {
  const [hoveredYes, setHoveredYes] = useState(false);
  const [hoveredNo, setHoveredNo] = useState(false);

  const total = yesCount + noCount;
  const yesPercent = total > 0 ? Math.round((100 * yesCount) / total) : 0;
  const noPercent = total > 0 ? Math.round((100 * noCount) / total) : 0;

  return (
    <div className={styles.centerWrap}>
      <p className={styles.subtitle}>Шпион предположил что это локация</p>
      
      <div className={`glass ${styles.guessBlock}`}>{guessText}</div>

      <div className={styles.voteBarWrap}>
        <div className={styles.voteBarHeader}>
          <div className={`${styles.voteStat} ${styles.voteStatYes}`}>
            <span className={styles.statLabel}>УГАДАЛ</span>
            <span className={styles.statPercent}>{yesPercent}%</span>
          </div>
          <div className={`${styles.voteStat} ${styles.voteStatNo}`}>
            <span className={styles.statLabel}>НЕТ</span>
            <span className={styles.statPercent}>{noPercent}%</span>
          </div>
        </div>

        <div className={styles.voteBarTrack}>
          <motion.div
            className={`${styles.voteBarFill} ${styles.voteBarFillYes}`}
            initial={{ width: 0 }}
            animate={{ width: `${yesPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
          <motion.div
            className={`${styles.voteBarFill} ${styles.voteBarFillNo}`}
            initial={{ width: 0 }}
            animate={{ width: `${noPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
      </div>

      {!isSpy && myVote === null && (
        <div className={styles.voteActions}>
          <motion.button
            type="button"
            className={`${styles.voteBtn} ${styles.voteBtnYes}`}
            onClick={() => {
              playUI('click');
              onVote('yes');
            }}
            onMouseEnter={() => {
              playUI('hover');
              setHoveredYes(true);
            }}
            onMouseLeave={() => setHoveredYes(false)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
          >
            <span className={styles.voteBtnLottie}>
              <LottieIcon 
                src={LOTTIE_YES} 
                size={28} 
                loop={false} 
                playOnHover 
                hovered={hoveredYes} 
              />
            </span>
            УГАДАЛ
          </motion.button>
          
          <motion.button
            type="button"
            className={`glass glass-hover ${styles.voteBtn} ${styles.voteBtnNo}`}
            onClick={() => {
              playUI('click');
              onVote('no');
            }}
            onMouseEnter={() => {
              playUI('hover');
              setHoveredNo(true);
            }}
            onMouseLeave={() => setHoveredNo(false)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
          >
            <span className={styles.voteBtnLottie}>
              <LottieIcon 
                src={LOTTIE_NO} 
                size={28} 
                loop={false} 
                playOnHover 
                hovered={hoveredNo} 
              />
            </span>
            НЕТ
          </motion.button>
        </div>
      )}
      {!isSpy && myVote !== null && (
        <p className={styles.voteDone}>Голос учтён. Проголосовало: {total} / {eligibleCount}</p>
      )}
      {isSpy && (
        <p className={styles.subtitle} style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          Ожидайте решения мирных агентов
        </p>
      )}
    </div>
  );
}