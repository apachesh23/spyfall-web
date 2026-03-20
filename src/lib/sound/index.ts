// Экспортируем логику плеера (функции)
export {
  playUI,
  playVFX,
  startAuthMusic,
  stopAuthMusic,
  startLobbyMusic,
  stopLobbyMusic,
  startGameMusic,
  stopGameMusic,
  startVoteMusic,
  stopVoteMusic,
  syncMusicVolume,
  skipAuthNext,
  skipAuthPrev,
  skipLobbyNext,
  skipLobbyPrev,
  skipGameNext,
  skipGamePrev,
} from './player';

// Экспортируем определения (константы и типы)
export {
  UI_SOUNDS,
  VFX_SOUNDS,
  MUSIC_TRACKS,
  MUSIC_PLAYLISTS,
} from './definitions';

export type {
  UISoundId,
  VFXSoundId,
  MusicTrackId,
  MusicPlaylistId,
} from './definitions';