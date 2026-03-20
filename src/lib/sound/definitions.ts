/**
 * Пути и базовая громкость (0–1) для выравнивания на этапе разработки.
 * Итоговая громкость = baseVolume * (громкость слоя из настроек пользователя).
 */

export const UI_SOUNDS = {
  tick: {
    src: '/sounds/ui/tick.wav',
    baseVolume: 0.1,
  },
  click: {
    src: '/sounds/ui/click.wav',
    baseVolume: 0.1,
  },
  hover: {
    src: '/sounds/ui/hover.wav',
    baseVolume: 0.1,
  },
  toggle: {
    src: '/sounds/ui/double-pop.mp3',
    baseVolume: 0.1,
  },
  wrong: {
    src: '/sounds/ui/wrong.mp3',
    baseVolume: 0.1,
  },
} as const;

export type UISoundId = keyof typeof UI_SOUNDS;

/** VFX-звуки (баннеры, счётчик, победа). Громкость регулируется слоем vfx в sound-store. */
export const VFX_SOUNDS = {
  woosh_in: {
    src: '/sounds/vfx/woosh3.mp3',
    baseVolume: 0.1,
  },
  woosh_out: {
    src: '/sounds/vfx/woosh2.mp3',
    baseVolume: 0.1,
  },
  countdown_sec: {
    src: '/sounds/vfx/countdown_sec.mp3',
    baseVolume: 0.05,
  },
  countdown_last: {
    src: '/sounds/vfx/countdown_last.mp3',
    baseVolume: 0.05,
  },
  victory: {
    src: '/sounds/vfx/victory.mp3',
    baseVolume: 0.1,
  },
  cartoon_explosion_poof: {
    src: '/sounds/vfx/cartoon-explosion-poof.mp3',
    baseVolume: 0.1,
  },
  lose: {
    src: '/sounds/vfx/lose.mp3',
    baseVolume: 0.1,
  },
  head_gore_explosion: {
    src: '/sounds/vfx/head-gore-explosion.mp3',
    baseVolume: 0.1,
  },
  liquid_or_blood: {
    src: '/sounds/vfx/liquid-or-blood.mp3',
    baseVolume: 0.1,
  },
  ball_win: {
    src: '/sounds/vfx/ball-win.mp3',
    baseVolume: 0.1,
  },
} as const;

export type VFXSoundId = keyof typeof VFX_SOUNDS;

export const MUSIC_TRACKS = {
  auth1: {
    src: '/sounds/music/auth1.mp3',
    baseVolume: 0.02,
  },
  lobby1: {
    src: '/sounds/music/lobby/lobby1.mp3',
    baseVolume: 0.02,
  },
  lobby2: {
    src: '/sounds/music/lobby/lobby2.mp3',
    baseVolume: 0.02,
  },
  game1: {
    src: '/sounds/music/game/game1.mp3',
    baseVolume: 0.02,
  },
  game2: {
    src: '/sounds/music/game/game2.mp3',
    baseVolume: 0.02,
  },
  game3: {
    src: '/sounds/music/game/game3.mp3',
    baseVolume: 0.02,
  },
  vote1: {
    src: '/sounds/music/vote/vote1.mp3',
    baseVolume: 0.02,
  },
  vote2: {
    src: '/sounds/music/vote/vote2.mp3',
    baseVolume: 0.02,
  },
} as const;

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

/** Плейлисты по контекстам экранов. vote — только во время сбора голосов (таймер тикает). */
export const MUSIC_PLAYLISTS = {
  auth: ['auth1'] as const,
  lobby: ['lobby1', 'lobby2'] as const,
  game: ['game1', 'game2', 'game3'] as const,
  vote: ['vote1', 'vote2'] as const,
} as const;

export type MusicPlaylistId = keyof typeof MUSIC_PLAYLISTS;
