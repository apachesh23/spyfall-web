import type { AvatarId } from '@/lib/avatars';

/**
 * Типы баннеров SplashScreen.
 * Каждому типу соответствует свой цвет и вариант контента (текст, таймер, иконки).
 */
export type SplashType =
  | 'system_start'      // "ГОТОВЫ ?" + таймер "Начало игры N"
  | 'system_pause'      // "Игра на паузе" + "Ожидаем ведущего" (статичный)
  | 'game_over_spy_win' // Шпион угадал локацию (будущая механика)
  | 'game_over_spy_win_voting' // Шпион победил (мирные выгнали мирного, шпион остался)
  | 'game_over_civilians_win' // Победа мирных (агентов)
  | 'spy_kill'          // Шпион кого-то убил
  | 'voting_kicked_civilian'; // Общий сплэш изгнания (мирный или шпион)

/** Цвета слоёв баннера: задний (тёмный) и передний (яркий). */
export type SplashColors = {
  back: string;
  front: string;
};

/** Цвета системных баннеров (system_start, system_pause). Отсюда передаются в компонент как --splash-front / --splash-back. */
export const SPLASH_SYSTEM_COLORS = {
  front: '#4B59F8',
  back: '#2d38a8',
} as const;

/** Конфиг по умолчанию для каждого типа: цвета и статичность. */
export const SPLASH_CONFIG: Record<
  SplashType,
  { colors: SplashColors; static: boolean; defaultCountdown?: number; countdownLabel?: string }
> = {
  system_start: {
    colors: { back: SPLASH_SYSTEM_COLORS.back, front: SPLASH_SYSTEM_COLORS.front },
    static: false,
    defaultCountdown: 5,
    countdownLabel: 'Начало игры',
  },
  system_pause: {
    colors: { back: SPLASH_SYSTEM_COLORS.back, front: SPLASH_SYSTEM_COLORS.front },
    static: true,
  },
  game_over_spy_win: {
    colors: { back: '#1a3314', front: '#326528' },
    static: true,
  },
  game_over_spy_win_voting: {
    colors: { back: '#1a3314', front: '#326528' },
    static: true,
  },
  game_over_civilians_win: {
    colors: { back: '#1a3314', front: '#326528' },
    static: true,
  },
  spy_kill: {
    colors: { back: '#B53A3A', front: '#ED4C4C' },
    static: false,
    defaultCountdown: 5,
    countdownLabel: 'Игра продолжается',
  },
  voting_kicked_civilian: {
    colors: { back: '#B77918', front: '#F3A221' },
    static: false,
    defaultCountdown: 5,
    countdownLabel: 'Игра продолжается',
  },
};

export type SplashScreenProps = {
  type: SplashType;
  /** Вызывается когда баннер нужно закрыть (таймер истёк или разрешён закрыть). */
  onClose?: () => void;
  /** Секунды обратного отсчёта. Для system_start по умолчанию 5. */
  countdownSeconds?: number;
  /** Текст рядом с таймером, например "Начало игры" или "Игра продолжается". */
  countdownLabel?: string;
  /** Жёсткое серверное время окончания события (ISO). Приоритетнее countdownSeconds+eventAt для расчёта оставшегося времени. */
  endsAt?: string;
  /** Переопределить заголовок (опционально). */
  title?: string;
  /** Переопределить подпись внизу (опционально). */
  subtitle?: string;
  /** Явно задать: баннер статичный (не закрывается). Иначе берётся из SPLASH_CONFIG. */
  static?: boolean;
  /** Показывать кнопку «Продолжить» для паузы (только у ведущего). По умолчанию false. */
  showContinueButton?: boolean;
  /** ISO-время появления события (at). Для таймера — считаем оставшееся время от него, чтобы вкладка, открытая позже, не показывала зависший 0. */
  eventAt?: string;
  /** Для победных баннеров: список игроков для отображения аватара шпиона. */
  players?: Array<{ id: string; nickname: string; avatar_id: AvatarId }>;
  /** ID шпионов из игры — показываем реального шпиона вместо случайного. */
  spyIds?: string[];
  /** Для voting_kicked_civilian (общий сплэш изгнания): кого изгнали — аватар, ник, роль. */
  eliminatedPlayer?: { nickname: string; avatar_id: AvatarId; role?: string | null };
  /** Был ли изгнанный шпионом (показываем подпись «Шпион» или роль). */
  eliminatedWasSpy?: boolean;
  /** Процент голосов изгнанного — показываем «Набрал n% голосов» под текстом. */
  eliminatedVotePercent?: number;
};
