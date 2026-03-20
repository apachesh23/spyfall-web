import type { SplashType } from './types';

/** Верхняя Lottie для победных/профильных баннеров (ball + avatar) */
export const VICTORY_LOTTIE_TOP = '/lottie/splash/ball.json';

/** Конфетти поверх всех слоёв, один раз при показе победы */
export const VICTORY_LOTTIE_CONFETTI = '/lottie/splash/confetti.json';

/** Кровь поверх слоёв для баннера убийства */
export const BLOOD_LOTTIE = '/lottie/splash/blood.json';

/** Нижняя Lottie: одна рандомная из списка в зависимости от типа победы */
export const VICTORY_LOTTIE_BOTTOM: Record<
  'game_over_spy_win' | 'game_over_spy_win_voting' | 'game_over_civilians_win',
  string[]
> = {
  game_over_spy_win: ['/lottie/splash/spy-win1.json', '/lottie/splash/spy-win2.json', '/lottie/splash/spy-win3.json'],
  game_over_spy_win_voting: ['/lottie/splash/spy-win1.json', '/lottie/splash/spy-win2.json', '/lottie/splash/spy-win3.json'],
  game_over_civilians_win: ['/lottie/splash/win1.json', '/lottie/splash/win2.json'],
};

/** Анимации убийства: одна рандомная из death1–death4 */
export const DEATH_LOTTIES: string[] = [
  '/lottie/splash/death1.json',
  '/lottie/splash/death2.json',
  '/lottie/splash/death3.json',
  '/lottie/splash/death4.json',
];

/** Дефолтные заголовок и подпись для каждого типа (для системных уже заданы). */
export const SPLASH_CONTENT: Record<SplashType, { title: string; subtitle?: string }> = {
  system_start: { title: 'ГОТОВЫ ?', subtitle: '' },
  system_pause: { title: 'Игра на паузе', subtitle: 'Ожидаем ведущего' },
  game_over_spy_win: { title: 'ШПИОН УГАДАЛ ЛОКАЦИЮ', subtitle: '' },
  game_over_spy_win_voting: { title: 'ШПИОН ПОБЕДИЛ', subtitle: '' },
  game_over_civilians_win: { title: 'АГЕНТЫ ПОБЕДИЛИ', subtitle: '' },
  spy_kill: { title: 'УБИЙСТВО', subtitle: '' },
  voting_kicked_civilian: { title: 'БЫЛ ИЗГНАН ГОЛОСОВАНИЕМ', subtitle: '' },
};
