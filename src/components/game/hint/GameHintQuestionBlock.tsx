'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LottieIcon } from '@/components/ui/LottieIcon';
import { playUI } from '@/lib/sound';
import styles from './GameHintQuestionBlock.module.css';

const FALLBACK_QUESTION = 'Как часто ты обычно бываешь в таком месте?';

type GameHintQuestionBlockProps = {
  onClick?: () => void;
  /** UUID текущей игры/партии (определяет пул неповторяющихся вопросов) */
  gameId?: string | null;
  /** Режим предпросмотра: фиксирует десктоп-лейаут и отключает клик. */
  previewMode?: boolean;
};

const CATEGORY_LABELS_RU: Record<string, string> = {
  actions: 'Активность / действия',
  people: 'Люди',
  space: 'Пространство и интерьер',
  atmosphere: 'Эмоциональная атмосфера',
  items: 'Предметы / детали',
  restrictions: 'Правила / ограничения',
  time: 'Время',
  preparation: 'Подготовка / Вход',
};

/** Кнопка «Что спросить?» + поповер с подсказкой. Для футера на мобильной (только кнопка). */
export function GameHintButton({ gameId, onClick }: GameHintQuestionBlockProps) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintCategoryKey, setHintCategoryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setButtonRect(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    setButtonRect(rect);
  }, [open]);

  useEffect(() => {
    if (!open || !gameId) return;
    let cancelled = false;
    setHintText(null);
    setHintCategoryKey(null);
    setLoading(true);
    const load = async () => {
      try {
        const res = await fetch('/api/game/hint-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        });
        const body: { text?: string | null; category_key?: string | null } = await res.json();
        if (!cancelled && typeof body?.text === 'string') {
          setHintText(body.text);
          setHintCategoryKey(body.category_key ?? null);
          setLoading(false);
          return;
        }
      } catch {
        // fallthrough to GET
      }

      // Fallback: если новая логика/миграции ещё не применены, продолжаем работать со старым GET.
      try {
        const res2 = await fetch('/api/game/hint-question');
        const body2: { text?: string | null; category_key?: string | null } = await res2.json();
        if (!cancelled) {
          setHintText(body2?.text ?? null);
          setHintCategoryKey(body2?.category_key ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHintText(null);
          setHintCategoryKey(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, gameId]);

  const handleToggle = () => {
    playUI('click');
    if (open) {
      setOpen(false);
      setIsClosing(true);
      onClick?.();
    } else {
      setOpen(true);
      onClick?.();
    }
  };

  const showCloseIcon = open || isClosing;

  const overlayPortal =
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <div key="hint-overlay" className={styles.overlay}>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleToggle}
            />
            <motion.div
              className={styles.popoverOverlay}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={
                buttonRect
                  ? {
                      // Привязываем поповер к реальной позиции кнопки,
                      // чтобы при изменении ширины/переноса текста он не "прыгал" по Y.
                      bottom: window.innerHeight - buttonRect.top + 4,
                    }
                  : undefined
              }
            >
              <div className={`glass ${styles.popoverInner} ${styles.popoverInnerOverlay}`}>
                <p className={styles.categoryTitle}>
                  {loading ? '…' : hintCategoryKey ? (CATEGORY_LABELS_RU[hintCategoryKey] ?? hintCategoryKey) : ''}
                </p>
                <p className={styles.popoverText}>
                  «{loading ? '…' : (hintText ?? FALLBACK_QUESTION)}»
                </p>
              </div>
              <div className={styles.popoverArrow} aria-hidden />
            </motion.div>
            {buttonRect && (
              <div
                className={styles.buttonAboveBackdrop}
                style={{
                  position: 'fixed',
                  left: buttonRect.left,
                  top: buttonRect.top,
                  width: buttonRect.width,
                  height: buttonRect.height,
                }}
              >
                <motion.button
                  type="button"
                  className={`glass glass-hover ${styles.buttonSquare}`}
                  onMouseEnter={() => playUI('hover')}
                  onClick={handleToggle}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.08 }}
                >
                  {showCloseIcon ? (
                    <LottieIcon
                      key="close"
                      src="/lottie/question_close.json"
                      size={32}
                      playOnce={isClosing}
                      playSegment={isClosing ? [0, 40] : undefined}
                      loopSegment={open ? [60, 180] : undefined}
                      onComplete={() => setIsClosing(false)}
                    />
                  ) : (
                    <LottieIcon src="/lottie/question.json" size={32} loop />
                  )}
                </motion.button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      {overlayPortal}
      <div
        ref={buttonRef}
        className={styles.root}
        style={open ? { visibility: 'hidden' as const } : undefined}
      >
        <motion.button
          type="button"
          className={`glass glass-hover ${styles.buttonSquare}`}
          onMouseEnter={() => playUI('hover')}
          onClick={handleToggle}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.08 }}
        >
          {showCloseIcon ? (
            <LottieIcon
              key="close"
              src="/lottie/question_close.json"
              size={32}
              playOnce={isClosing}
              playSegment={isClosing ? [0, 40] : undefined}
              loopSegment={open ? [60, 180] : undefined}
              onComplete={() => setIsClosing(false)}
            />
          ) : (
            <LottieIcon src="/lottie/question.json" size={32} loop />
          )}
        </motion.button>
      </div>
    </>
  );
}

export function GameHintQuestionBlock({ onClick, gameId, previewMode = false }: GameHintQuestionBlockProps) {
  const [hoveredBlock, setHoveredBlock] = useState(false);
  const [_hoveredButton, setHoveredButton] = useState(false);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintCategoryKey, setHintCategoryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !gameId) return;
    let cancelled = false;
    setHintText(null);
    setHintCategoryKey(null);
    setLoading(true);
    const load = async () => {
      try {
        const res = await fetch('/api/game/hint-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        });
        const body: { text?: string | null; category_key?: string | null } = await res.json();
        if (!cancelled && typeof body?.text === 'string') {
          setHintText(body.text);
          setHintCategoryKey(body.category_key ?? null);
          setLoading(false);
          return;
        }
      } catch {
        // fallthrough to GET
      }

      // Fallback: старый GET
      try {
        const res2 = await fetch('/api/game/hint-question');
        const body2: { text?: string | null; category_key?: string | null } = await res2.json();
        if (!cancelled) {
          setHintText(body2?.text ?? null);
          setHintCategoryKey(body2?.category_key ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHintText(null);
          setHintCategoryKey(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, gameId]);

  const handleToggle = () => {
    if (previewMode) return;

    playUI('click');
    if (open) {
      setOpen(false);
      setIsClosing(true);
      onClick?.();
    } else {
      setOpen(true);
      onClick?.();
    }
  };

  const handleCloseAnimationComplete = () => {
    setIsClosing(false);
  };

  const showCloseIcon = open || isClosing;

  return (
    <div className={`${styles.root} ${previewMode ? styles.rootPreview : ''}`}>
      <AnimatePresence>
        {open && !previewMode && (
          <>
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleToggle}
            />
            <motion.div
              className={styles.popover}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`glass ${styles.popoverInner}`}>
                {hintCategoryKey && (
                  <p className={styles.categoryTitle}>
                    {CATEGORY_LABELS_RU[hintCategoryKey] ?? hintCategoryKey}
                  </p>
                )}
                <p className={styles.popoverText}>
                  «{loading ? '…' : (hintText ?? FALLBACK_QUESTION)}»
                </p>
              </div>
              <div className={styles.popoverArrow} aria-hidden />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        className={`glass ${styles.wrap}`}
        onMouseEnter={() => setHoveredBlock(true)}
        onMouseLeave={() => setHoveredBlock(false)}
        whileHover={{ filter: 'brightness(1.03)' }}
        transition={{ duration: 0.08 }}
      >
        <div className={styles.left}>
          <div className={styles.iconMain}>
            <LottieIcon
              src="/lottie/robot.json"
              size={40}
              playOnHover
              hovered={hoveredBlock}
            />
          </div>
          <div className={styles.textBlock}>
            <h2 className={styles.title}>ЧТО СПРОСИТЬ?</h2>
            <p className={styles.subtitle}>
              Если не можешь придумать вопрос&nbsp;— жми кнопку
            </p>
          </div>
        </div>
        <div className={styles.buttonWrap}>
          <motion.button
            type="button"
            className={`glass glass-hover ${styles.buttonSquare}`}
            onMouseEnter={() => {
              setHoveredButton(true);
              if (!previewMode) playUI('hover');
            }}
            onMouseLeave={() => setHoveredButton(false)}
            onClick={handleToggle}
            whileTap={previewMode ? undefined : { scale: 0.95 }}
            transition={{ duration: 0.08 }}
          >
            {showCloseIcon ? (
              <LottieIcon
                key="close"
                src="/lottie/question_close.json"
                size={32}
                playOnce={isClosing}
                playSegment={isClosing ? [0, 40] : undefined}
                loopSegment={open ? [60, 180] : undefined}
                onComplete={isClosing ? handleCloseAnimationComplete : undefined}
              />
            ) : (
              <LottieIcon
                src="/lottie/question.json"
                size={32}
                loop
              />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

