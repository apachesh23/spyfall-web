import { create } from 'zustand';

type RouteLoaderState = {
  isVisible: boolean;
  /** Показать глобальный лоадер (накрывает всё приложение). */
  start: () => void;
  /** Спрятать глобальный лоадер. */
  stop: () => void;
};

export const useRouteLoaderStore = create<RouteLoaderState>((set) => ({
  // По умолчанию глобальный лоадер выключен.
  // Для F5 используем статический initial-loader в layout.tsx.
  isVisible: false,
  start: () => set({ isVisible: true }),
  stop: () => set({ isVisible: false }),
}));

