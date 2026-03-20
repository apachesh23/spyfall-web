'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconVolume,
  IconVolumeOff,
  IconMaximize,
  IconMinimize,
  IconMenu2,
  IconX,
  IconChevronDown,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSoundStore } from '@/store/sound-store';
import { useIsLobbyMobile } from '@/hooks/room/useIsLobbyMobile';
import { useRouteLoaderStore } from '@/store/route-loader-store';
import { playUI } from '@/lib/sound';
import { supabase } from '@/lib/supabase/client';
import { Logo } from './Logo';
import { PrimaryButtonLobby } from '@/components/ui/PrimaryButtonLobby';
import { SoundPopover } from './SoundPopover';
import { RulesModal } from './RulesModal';
import styles from './TopBar.module.css';

const LOCALE_STORAGE_KEY = 'spyfall_locale';
const LOCALES = [
  { value: 'ru', label: 'RUSSIAN', icon: '/language/RU.webp' },
  { value: 'ua', label: 'UKRAINIAN', icon: '/language/UA.webp' },
  { value: 'en', label: 'ENGLISH', icon: '/language/EN.webp' },
] as const;
type LocaleCode = (typeof LOCALES)[number]['value'];

export function TopBar() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPopoverRef = useRef<HTMLDivElement>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activeRoomInfo, setActiveRoomInfo] = useState<{
    current: number;
    max: number | null;
    status: string | null;
  } | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [locale, setLocaleState] = useState<LocaleCode>('ru');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const [langDropdownRect, setLangDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [_checkingActiveRoom, setCheckingActiveRoom] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsLobbyMobile();

  const ui = useSoundStore((s) => s.ui);
  const music = useSoundStore((s) => s.music);
  const vfx = useSoundStore((s) => s.vfx);
  const allMuted = ui.muted && music.muted && vfx.muted;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setSupportsFullscreen(typeof document.documentElement.requestFullscreen === 'function');
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Общая функция: обнаружить код комнаты и проверить в БД.
  const discoverAndCheckActiveRoom = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    let code: string | null = null;
    const matchRoom = pathname?.match(/^\/room\/([^/]+)/);
    const matchGame = pathname?.match(/^\/game\/([^/]+)/);
    const matchInvite = pathname?.match(/^\/invite\/([^/]+)/);
    if (matchRoom?.[1]) {
      code = matchRoom[1];
      window.localStorage.setItem('active_room_code', code);
    } else if (matchGame?.[1]) {
      code = matchGame[1];
      window.localStorage.setItem('active_room_code', code);
    } else if (matchInvite?.[1] && matchInvite[1] !== 'null') {
      // Код в URL invite — показываем кнопку «Вернуться» (fallback для iOS, когда localStorage потерян)
      code = matchInvite[1];
    } else {
      code = window.localStorage.getItem('active_room_code');
      if (!code) {
        const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('player_'));
        const codes = keys.map((k) => k.replace(/^player_/, '')).filter(Boolean);
        if (codes.length > 0) {
          code = codes[0];
          window.localStorage.setItem('active_room_code', code);
        }
      }
    }

    if (!code) {
      setActiveRoomCode(null);
      setActiveRoomInfo(null);
      return;
    }

    const codeFromInviteUrl = matchInvite?.[1] && matchInvite[1] !== 'null';
    setActiveRoomCode(code);
    setCheckingActiveRoom(true);

    try {
      const playerKey = `player_${code}`;
      const playerId = window.localStorage.getItem(playerKey);
      if (!playerId) {
        if (!codeFromInviteUrl) {
          window.localStorage.removeItem('active_room_code');
          setActiveRoomCode(null);
        }
        return;
      }

      const { data: player, error } = await supabase
        .from('players')
        .select('id, room_id')
        .eq('id', playerId)
        .single();

      if (error || !player) {
        if (!codeFromInviteUrl) {
          window.localStorage.removeItem(playerKey);
          window.localStorage.removeItem('active_room_code');
          setActiveRoomCode(null);
          setActiveRoomInfo(null);
        }
        return;
      }

      const roomId = (player as { room_id: string }).room_id;

      const { count: playerCount } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId);

      const { data: room } = await supabase
        .from('rooms')
        .select('settings, status')
        .eq('id', roomId)
        .single();

      const current = typeof playerCount === 'number' ? playerCount : 0;
      const max = room?.settings && typeof room.settings.max_players === 'number'
        ? room.settings.max_players
        : null;
      const status: string | null = room && typeof room.status === 'string' ? room.status : null;

      setActiveRoomInfo({ current, max, status });
    } finally {
      setCheckingActiveRoom(false);
    }
  }, [pathname]);

  // При смене pathname — обновляем код и проверяем.
  useEffect(() => {
    discoverAndCheckActiveRoom();
  }, [pathname, discoverAndCheckActiveRoom]);

  // При открытии popover — перечитываем БД (свежие данные, восстановление по player_*).
  useEffect(() => {
    if (menuOpen) {
      discoverAndCheckActiveRoom();
    }
  }, [menuOpen, discoverAndCheckActiveRoom]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleCode | null;
    if (stored && LOCALES.some((l) => l.value === stored)) setLocaleState(stored);
  }, []);

  const setLocale = (value: LocaleCode) => {
    setLocaleState(value);
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_STORAGE_KEY, value);
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.()?.catch(() => {});
    } else {
      document.exitFullscreen?.()?.catch(() => {});
    }
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const anchor = menuButtonRef.current;
      const pop = menuPopoverRef.current;
      if (pop?.contains(target) || anchor?.contains(target)) return;
      if ((target as Element).closest?.('[data-language-dropdown]')) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!langDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const wrap = langDropdownRef.current;
      if (wrap?.contains(target)) return;
      if ((target as Element).closest?.('[data-language-dropdown]')) return;
      setLangDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langDropdownOpen]);

  useEffect(() => {
    if (!langDropdownOpen || typeof document === 'undefined') return;
    const wrap = langDropdownRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setLangDropdownRect({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    return () => setLangDropdownRect(null);
  }, [langDropdownOpen]);

  const goTo = (href: string) => {
    // Глобальный лоадер для навигации между основными страницами (Create / Invite / Room)
    useRouteLoaderStore.getState().start();
    closeMenu();

    // Для лёгких страниц (Create / Invite) даём микропаузу,
    // чтобы лоадер успел накрыть старый UI до подмены контента.
    const needsDelay = href === '/' || href.startsWith('/invite');
    const delayMs = needsDelay ? 500 : 0;

    if (delayMs > 0) {
      setTimeout(() => router.push(href), delayMs);
    } else {
      router.push(href);
    }
  };

  const isAuthPage =
    pathname?.startsWith('/create') || pathname?.startsWith('/invite/');
  const isRoomPage = pathname?.startsWith('/room/');
  const isGamePage = pathname?.startsWith('/game/');
  const soundDebugContext = isAuthPage ? 'auth' : isRoomPage ? 'lobby' : isGamePage ? 'game' : undefined;

  const anyPopoverOpen = soundOpen || menuOpen;

  return (
    <header className={styles.root}>
      {anyPopoverOpen && (
        <AnimatePresence>
          <motion.div
            className={styles.popoverBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setSoundOpen(false);
              setMenuOpen(false);
            }}
            aria-hidden
          />
        </AnimatePresence>
      )}
      {/* Левая часть: Звук */}
      <div className={styles.soundWrap}>
        <motion.button
          ref={soundButtonRef}
          type="button"
          className={`${styles.iconButton} glass glass-hover`}
          onClick={() => {
            playUI('click');
            setSoundOpen((o) => !o);
          }}
          onMouseEnter={() => playUI('hover')}
          aria-label="Звук"
          aria-expanded={soundOpen}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.08 }}
        >
          <span className={styles.icon} aria-hidden>
            <AnimatePresence initial={false}>
              <motion.span
                key={allMuted ? 'off' : 'on'}
                className={styles.iconLayer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {allMuted ? (
                  <IconVolumeOff size={28} stroke={2} />
                ) : (
                  <IconVolume size={28} stroke={2} />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
        <SoundPopover
          open={soundOpen}
          onClose={() => setSoundOpen(false)}
          anchorRef={soundButtonRef}
          debugContext={soundDebugContext}
        />
      </div>

      {/* Центр: Логотип */}
      <div className={styles.logoWrap}>
        <Logo />
      </div>

      {/* Правая часть: Меню и Fullscreen */}
      <div className={styles.rightActions}>
        {!isMobile && supportsFullscreen && (
          <motion.button
            type="button"
            className={`${styles.iconButton} glass glass-hover ${styles.fullscreenButton}`}
            onClick={() => {
              playUI('click');
              toggleFullscreen();
            }}
            onMouseEnter={() => playUI('hover')}
            aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.08 }}
          >
            <span className={styles.icon} aria-hidden>
              <AnimatePresence initial={false}>
                <motion.span
                  key={isFullscreen ? 'min' : 'max'}
                  className={styles.iconLayer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isFullscreen ? (
                    <IconMinimize size={28} stroke={2} />
                  ) : (
                    <IconMaximize size={28} stroke={2} />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.button>
        )}

        <div className={styles.menuWrap}>
          <motion.button
            type="button"
            ref={menuButtonRef}
            className={`${styles.iconButton} glass glass-hover`}
            onClick={() => {
              playUI('click');
              setMenuOpen((o) => !o);
            }}
            onMouseEnter={() => playUI('hover')}
            aria-label="Меню"
            aria-expanded={menuOpen}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.08 }}
          >
            <span className={styles.icon} aria-hidden>
              <AnimatePresence initial={false}>
                <motion.span
                  key={menuOpen ? 'close' : 'menu'}
                  className={styles.iconLayer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {menuOpen ? (
                    <IconX size={28} stroke={2} />
                  ) : (
                    <IconMenu2 size={28} stroke={2} />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                ref={menuPopoverRef}
                className={`glass ${styles.menuPopover}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <p className={styles.menuSectionTitle}>Навигация</p>
                <motion.button
                  type="button"
                  className={`glass glass-hover ${styles.menuItemButton}`}
                  onClick={() => {
                    playUI('click');
                    goTo('/');
                  }}
                  onMouseEnter={() => playUI('hover')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.08 }}
                >
                  Создать свою комнату
                </motion.button>
                <motion.button
                  type="button"
                  className={`glass glass-hover ${styles.menuItemButton}`}
                  onClick={() => {
                    playUI('click');
                    goTo('/invite/null');
                  }}
                  onMouseEnter={() => playUI('hover')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.08 }}
                >
                  Войти в комнату
                </motion.button>

                {activeRoomCode && (
                  <>
                    <div className={styles.menuActiveHeaderRow}>
                      <p className={styles.menuSectionTitle}>Активная комната</p>
                      {activeRoomInfo && activeRoomInfo.status && (
                        <span
                          className={`${styles.menuRoomStatus} ${
                            activeRoomInfo.status === 'waiting' || activeRoomInfo.status === 'none'
                              ? styles.menuRoomStatusLobby
                              : styles.menuRoomStatusGame
                          }`}
                        >
                          {activeRoomInfo.status === 'waiting' || activeRoomInfo.status === 'none'
                            ? 'ЛОББИ'
                            : 'В ИГРЕ'}
                        </span>
                      )}
                      {activeRoomInfo && (
                        <span
                          className={`${styles.menuRoomStats} ${
                            activeRoomInfo.status === 'waiting' || activeRoomInfo.status === 'none'
                              ? styles.menuRoomStatusLobby
                              : styles.menuRoomStatusGame
                          }`}
                        >
                          [{activeRoomInfo.current}
                          {activeRoomInfo.max != null ? `/${activeRoomInfo.max}` : ''}]
                        </span>
                      )}
                    </div>
                    <PrimaryButtonLobby
                      onClick={() => {
                        const status = activeRoomInfo?.status;
                        const href =
                          status && status !== 'waiting' && status !== 'none'
                            ? `/game/${activeRoomCode}`
                            : `/room/${activeRoomCode}`;
                        goTo(href);
                      }}
                      className={styles.menuItemButtonAccent}
                      soundClick="click"
                      soundHover="hover"
                    >
                      Вернуться в{' '}
                      <span className={styles.menuRoomCode}>{activeRoomCode}</span>
                    </PrimaryButtonLobby>
                  </>
                )}

                <p className={styles.menuSectionTitle}>Правила</p>
                <motion.button
                  type="button"
                  className={`glass glass-hover ${styles.menuItemButton}`}
                  onClick={() => {
                    playUI('click');
                    closeMenu();
                    setRulesModalOpen(true);
                  }}
                  onMouseEnter={() => playUI('hover')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.08 }}
                >
                  Правила игры
                </motion.button>

                <p className={styles.menuSectionTitle}>Выберите язык</p>
                <div className={styles.menuLanguageWrap} ref={langDropdownRef}>
                  <motion.button
                    type="button"
                    className={`glass glass-hover ${styles.menuLanguageTrigger}`}
                    onClick={() => {
                      playUI('click');
                      setLangDropdownOpen((o) => !o);
                    }}
                    onMouseEnter={() => playUI('hover')}
                    aria-expanded={langDropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="Выберите язык"
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.08 }}
                  >
                    <img
                      src={LOCALES.find((l) => l.value === locale)?.icon}
                      alt=""
                      className={styles.menuLanguageIcon}
                      width={28}
                      height={28}
                    />
                    <span className={styles.menuLanguageLabel}>{LOCALES.find((l) => l.value === locale)?.label}</span>
                    <span className={`${styles.menuLanguageChevron} ${langDropdownOpen ? styles.menuLanguageChevronOpen : ''}`} aria-hidden>
                      <IconChevronDown size={18} stroke={2} />
                    </span>
                  </motion.button>
                  {typeof document !== 'undefined' &&
                    langDropdownOpen &&
                    langDropdownRect &&
                    createPortal(
                      <AnimatePresence>
                        <motion.div
                          data-language-dropdown
                          className={`glass ${styles.menuLanguageDropdown} ${styles.menuLanguageDropdownPortal}`}
                          style={{
                            position: 'fixed',
                            top: langDropdownRect.top,
                            left: langDropdownRect.left,
                            width: langDropdownRect.width,
                            zIndex: 130,
                          }}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                          role="listbox"
                        >
                          {LOCALES.filter((item) => item.value !== locale).map((item) => (
                            <motion.button
                              key={item.value}
                              type="button"
                              role="option"
                              className={`glass glass-hover ${styles.menuLanguageOption}`}
                              onClick={() => {
                                playUI('click');
                                setLocale(item.value);
                                setLangDropdownOpen(false);
                              }}
                              onMouseEnter={() => playUI('hover')}
                              whileTap={{ scale: 0.98 }}
                              transition={{ duration: 0.08 }}
                            >
                              <img src={item.icon} alt="" className={styles.menuLanguageOptionIcon} width={24} height={24} />
                              <span>{item.label}</span>
                            </motion.button>
                          ))}
                        </motion.div>
                      </AnimatePresence>,
                      document.body
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <RulesModal open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />
    </header>
  );
}