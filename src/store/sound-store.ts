import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SoundLayer = 'ui' | 'music' | 'vfx';

type LayerState = {
  volume: number;
  muted: boolean;
};

type SoundState = {
  ui: LayerState;
  music: LayerState;
  vfx: LayerState;
};

const defaultLayer = (): LayerState => ({ volume: 1, muted: false });

const initialState: SoundState = {
  ui: defaultLayer(),
  music: defaultLayer(),
  vfx: defaultLayer(),
};

type SoundActions = {
  setVolume: (layer: SoundLayer, volume: number) => void;
  setMuted: (layer: SoundLayer, muted: boolean) => void;
  toggleMuted: (layer: SoundLayer) => void;
};

export const useSoundStore = create<SoundState & SoundActions>()(
  persist(
    (set) => ({
      ...initialState,
      setVolume: (layer, volume) =>
        set((state) => ({
          ...state,
          [layer]: { ...state[layer], volume: Math.max(0, Math.min(1, volume)) },
        })),
      setMuted: (layer, muted) =>
        set((state) => ({ ...state, [layer]: { ...state[layer], muted } })),
      toggleMuted: (layer) =>
        set((state) => ({ ...state, [layer]: { ...state[layer], muted: !state[layer].muted } })),
    }),
    { name: 'spyfall-sound' }
  )
);
