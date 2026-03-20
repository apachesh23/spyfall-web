/**
 * Единый набор UI-эффектов для проекта.
 * Используй эти константы в компонентах, чтобы поведение кнопок, инпутов и т.д. было одинаковым везде.
 */

// --- Кнопки ---

/** Hover: лёгкое увеличение и подъём, без полной заливки чёрным */
export const buttonPrimaryHover =
  'hover:scale-[1.01] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_0_16px_#F7C431]';

/** Active (зажатие): лёгкое уменьшение */
export const buttonPrimaryActive = 'active:scale-[0.98] active:translate-y-0';

/** Focus: кольцо для доступности */
export const buttonPrimaryFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C431] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

/** Отключение hover/active когда кнопка disabled */
export const buttonPrimaryDisabled =
  'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:brightness-100 disabled:active:scale-100';

/** Собрать все классы для основной кнопки (hover + active + focus + disabled) */
export const buttonPrimaryEffects = [
  buttonPrimaryHover,
  buttonPrimaryActive,
  buttonPrimaryFocus,
  buttonPrimaryDisabled,
].join(' ');

// --- Инпут ---

/** Фокус: жёлтый акцент (как у кнопок) */
export const inputFocusRing = 'focus:ring-[#F7C431] focus:border-[#F7C431]/50';

// --- Инпут с ошибкой ---

/** Обводка и кольцо при ошибке валидации */
export const inputErrorBorder = 'border-red-400/80 ring-2 ring-red-400/30';

/** Класс для контейнера инпута при ошибке — запускает shake (ключевые кадры в globals.css) */
export const inputErrorShake = 'animate-input-shake';
