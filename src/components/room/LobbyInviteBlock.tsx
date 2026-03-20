'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCopy, IconCopyCheck } from '@tabler/icons-react';
import styles from './LobbyInviteBlock.module.css';
import { playUI } from '@/lib/sound';

type LobbyInviteBlockProps = {
  code: string;
  className?: string;
};

// ЕДИНАЯ ФИЗИКА
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 };

const CENTER_GAP = '30px'; 
const EDGE_GAP = '10px';

function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);
  return origin;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    // ОБНОВЛЕНО: Теперь мобильная версия включается до 1024px включительно
    const update = () => setIsMobile(window.matchMedia('(max-width: 1024px)').matches);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isMobile;
}

const COPY_SUCCESS_DURATION = 2000;

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return <IconCopyCheck size={20} className={styles.copyIconSuccess} />;
  }
  return <IconCopy size={20} className={styles.copyIcon} />;
}

export function LobbyInviteBlock({ code, className = '' }: LobbyInviteBlockProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'invite'>('invite');
  const origin = useOrigin();
  const isMobile = useIsMobile();
  
  const inviteBase = origin ? `${origin}/invite/` : '.../';
  const fullInviteUrl = `${inviteBase}${code}`;

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback', err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      textArea.style.fontSize = "16px"; 
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      
      document.body.removeChild(textArea);
      return success;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  }, []);

  const props = { code, inviteBase, fullInviteUrl, activeTab, setActiveTab, copyToClipboard };

  return (
    <div className={`${styles.root} ${className}`}>
      {isMobile ? <MobileVersion {...props} /> : <DesktopVersion {...props} />}
    </div>
  );
}

type VersionProps = {
  code: string;
  inviteBase: string;
  fullInviteUrl: string;
  activeTab: 'code' | 'invite';
  setActiveTab: (t: 'code' | 'invite') => void;
  copyToClipboard: (t: string) => Promise<boolean>;
};

// --- DESKTOP ---
function DesktopVersion({ code, inviteBase, fullInviteUrl, activeTab, setActiveTab, copyToClipboard }: VersionProps) {
  const isCodeActive = activeTab === 'code';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyCode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    playUI('click');
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), COPY_SUCCESS_DURATION);
    }
  }, [code, copyToClipboard]);

  const handleCopyInvite = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    playUI('click');
    const ok = await copyToClipboard(fullInviteUrl);
    if (ok) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), COPY_SUCCESS_DURATION);
    }
  }, [fullInviteUrl, copyToClipboard]);

  return (
    <div className={styles.desktopContainer}>
      
      {/* LEFT BLOCK (CODE) */}
      <motion.div
        className={`glass ${!isCodeActive ? 'glass-hover' : ''} ${styles.block} ${styles.blockLeft}`}
        onClick={() => {
          setActiveTab('code');
          playUI('click');
        }}
        onMouseEnter={() => {
          if (!isCodeActive) playUI('hover');
        }}
        animate={{ width: isCodeActive ? '75%' : '25%' }}
        transition={SPRING}
      >
        <div
          className={styles.blockInner}
          style={{
            justifyContent: isCodeActive ? 'flex-end' : 'center',
            paddingLeft: isCodeActive ? EDGE_GAP : '0px',
            paddingRight: isCodeActive ? CENTER_GAP : '0px',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {isCodeActive ? (
              <motion.div
                key="active-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={styles.rowActive}
              >
                <div
                  className={`glass-input ${styles.inputBox} ${styles.inputBoxClickable}`}
                  onClick={handleCopyCode}
                >
                   <span className={styles.inputTextContainer}>
                      <span className={styles.urlCode}>{code}</span>
                   </span>
                   <CopyIcon copied={copiedCode} />
                </div>
                <span className={`${styles.label} ${styles.labelActive}`}>Код комнаты</span>
              </motion.div>
            ) : (
              <motion.span 
                key="inactive-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`${styles.label} ${styles.labelInactive}`} 
                style={{ textAlign: 'center', width: '100%' }}
              >
                Код комнаты
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* RIGHT BLOCK (INVITE) */}
      <motion.div
        className={`glass ${isCodeActive ? 'glass-hover' : ''} ${styles.block} ${styles.blockRight}`}
        onClick={() => {
          setActiveTab('invite');
          playUI('click');
        }}
        onMouseEnter={() => {
          if (isCodeActive) playUI('hover');
        }}
        animate={{ width: !isCodeActive ? '75%' : '25%' }}
        transition={SPRING}
      >
        <div
          className={styles.blockInner}
          style={{
            justifyContent: !isCodeActive ? 'flex-start' : 'center',
            paddingLeft: !isCodeActive ? CENTER_GAP : '0px',
            paddingRight: !isCodeActive ? EDGE_GAP : '0px',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!isCodeActive ? (
              <motion.div
                key="active-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={styles.rowActive}
              >
                <span className={`${styles.label} ${styles.labelActive}`}>Инвайт ссылка</span>
                <div
                  className={`glass-input ${styles.inputBox} ${styles.inputBoxClickable}`}
                  onClick={handleCopyInvite}
                >
                   <span className={styles.inputTextContainer}>
                      <span className={styles.urlBase}>{inviteBase.replace(/^https?:\/\//, '')}</span>
                      <span className={styles.urlCode}>{code}</span>
                   </span>
                   <CopyIcon copied={copiedInvite} />
                </div>
              </motion.div>
            ) : (
              <motion.span 
                key="inactive-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`${styles.label} ${styles.labelInactive}`} 
                style={{ textAlign: 'center', width: '100%' }}
              >
                Инвайт
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* OR BADGE */}
      <motion.div
        className={styles.orBadgeWrap}
        animate={{ left: isCodeActive ? '75%' : '25%' }}
        transition={SPRING}
      >
        <div className={styles.vSeparator} />
        <div className={styles.orBadge}>
          <span className={styles.orText}>OR</span>
        </div>
      </motion.div>
    </div>
  );
}

// --- MOBILE ---
const MOBILE_ACTIVE_HEIGHT = 170; 
const MOBILE_COLLAPSED_HEIGHT = 80;

function MobileVersion({ code, inviteBase, fullInviteUrl, activeTab, setActiveTab, copyToClipboard }: VersionProps) {
  const isCodeActive = activeTab === 'code';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const safeCopy = async (e: React.MouseEvent, text: string, setCopied: (v: boolean) => void) => {
    e.stopPropagation();
    playUI('click');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_SUCCESS_DURATION);
    }
  };

  return (
    <div className={styles.mobileContainer}>
      {/* TOP BLOCK (CODE) */}
      <motion.div
        className={`glass ${!isCodeActive ? 'glass-hover' : ''} ${styles.mobileBlock} ${styles.mobileBlockTop}`}
        onClick={() => {
          setActiveTab('code');
          playUI('click');
        }}
        animate={{ height: isCodeActive ? MOBILE_ACTIVE_HEIGHT : MOBILE_COLLAPSED_HEIGHT }}
        transition={SPRING}
      >
        <AnimatePresence mode="popLayout">
          {isCodeActive ? (
            <motion.div
              key="active-mobile-code"
              className={styles.mobileContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <span className={`${styles.label} ${styles.labelActive}`}>Код комнаты</span>
              <div
                className={`glass-input ${styles.inputBox} ${styles.inputBoxClickable}`}
                style={{ width: '100%', height: '60px' }}
                onClick={(e) => safeCopy(e, code, setCopiedCode)}
              >
                <span className={styles.inputTextContainer}>
                    <span className={styles.urlCode}>{code}</span>
                </span>
                <CopyIcon copied={copiedCode} />
              </div>
            </motion.div>
          ) : (
            <motion.span
              key="inactive-mobile-code"
              className={`${styles.label} ${styles.labelInactive}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Код комнаты
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MOBILE OR BADGE */}
      <motion.div
        className={styles.mobileOrBadgeWrap}
        animate={{ top: isCodeActive ? MOBILE_ACTIVE_HEIGHT : MOBILE_COLLAPSED_HEIGHT }}
        transition={SPRING}
      >
        <div className={styles.orBadge}>
          <span className={styles.orText}>OR</span>
        </div>
      </motion.div>

      {/* BOTTOM BLOCK (INVITE) */}
      <motion.div
        className={`glass ${isCodeActive ? 'glass-hover' : ''} ${styles.mobileBlock} ${styles.mobileBlockBottom}`}
        onClick={() => {
          setActiveTab('invite');
          playUI('click');
        }}
        animate={{ height: !isCodeActive ? MOBILE_ACTIVE_HEIGHT : MOBILE_COLLAPSED_HEIGHT }}
        transition={SPRING}
      >
        <AnimatePresence mode="popLayout">
          {!isCodeActive ? (
            <motion.div
              key="active-mobile-invite"
              className={styles.mobileContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <span className={`${styles.label} ${styles.labelActive}`}>Инвайт ссылка</span>
              <div
                className={`glass-input ${styles.inputBox} ${styles.inputBoxClickable}`}
                style={{ width: '100%', height: '60px' }}
                onClick={(e) => safeCopy(e, fullInviteUrl, setCopiedInvite)}
              >
                <span className={styles.inputTextContainer}>
                    <span className={styles.urlBase}>{inviteBase.replace(/^https?:\/\//, '')}</span>
                    <span className={styles.urlCode}>{code}</span>
                </span>
                <CopyIcon copied={copiedInvite} />
              </div>
            </motion.div>
          ) : (
            <motion.span
              key="inactive-mobile-invite"
              className={`${styles.label} ${styles.labelInactive}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Инвайт ссылка
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}