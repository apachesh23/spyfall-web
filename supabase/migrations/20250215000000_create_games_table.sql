-- =============================================================================
-- Вынос игрового состояния из rooms в отдельную таблицу games
-- Room: только лобби (code, host_id, status, settings, splash_event для START, max_players, is_locked)
-- Game: одна запись = одна игровая сессия (локация, шпионы, таймер, голосование, splash_event для игровых сплэшей)
-- =============================================================================

-- 1. Таблица games
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  location_id uuid,
  selected_theme text,
  spy_ids uuid[] DEFAULT '{}',
  started_at timestamptz,
  ends_at timestamptz,
  voting_status character varying DEFAULT 'none',
  voting_started_at timestamptz,
  voting_ends_at timestamptz,
  voting_round integer DEFAULT 1,
  revote_candidates uuid[],
  paused_at timestamptz,
  remaining_time_ms integer,
  splash_event jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.games IS 'Одна запись = одна игровая сессия в комнате. Голосования и таймер привязаны к игре.';
COMMENT ON COLUMN public.games.splash_event IS 'Игровые баннеры: voting, game_over_*, spy_kill и т.д. (в лобби используется rooms.splash_event только для system_start).';

-- 2. Переносим текущее игровое состояние из rooms в games (если есть)
INSERT INTO public.games (
  room_id,
  location_id,
  selected_theme,
  spy_ids,
  started_at,
  ends_at,
  voting_status,
  voting_started_at,
  voting_ends_at,
  voting_round,
  revote_candidates,
  paused_at,
  remaining_time_ms
)
SELECT
  id,
  location_id,
  selected_theme,
  COALESCE(spy_ids, '{}'),
  game_started_at,
  game_ends_at,
  COALESCE(voting_status, 'none'),
  voting_started_at,
  voting_ends_at,
  COALESCE(voting_round, 1),
  revote_candidates,
  game_paused_at,
  remaining_time_ms
FROM public.rooms
WHERE location_id IS NOT NULL OR status = 'playing';

-- 3. Добавляем в rooms ссылку на текущую игру
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS current_game_id uuid REFERENCES public.games(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rooms.current_game_id IS 'Активная игра в комнате. NULL = лобби без игры.';

-- 4. Проставляем current_game_id для комнат, у которых уже есть перенесённая игра
UPDATE public.rooms r
SET current_game_id = (
  SELECT g.id
  FROM public.games g
  WHERE g.room_id = r.id
  ORDER BY g.started_at DESC NULLS LAST
  LIMIT 1
)
WHERE r.location_id IS NOT NULL OR r.status = 'playing';

-- 5. Удаляем игровые колонки из rooms
ALTER TABLE public.rooms DROP COLUMN IF EXISTS location_id;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS selected_theme;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS spy_ids;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS game_started_at;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS game_ends_at;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS voting_status;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS voting_started_at;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS voting_ends_at;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS voting_round;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS revote_candidates;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS game_paused_at;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS remaining_time_ms;

-- 6. max_players по умолчанию 20
ALTER TABLE public.rooms
ALTER COLUMN max_players SET DEFAULT 20;

-- 7. Индекс для быстрого поиска игры по комнате
CREATE INDEX IF NOT EXISTS idx_games_room_id ON public.games(room_id);

-- 8. Realtime для таблицы games (если публикация существует и таблицы ещё нет в ней)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
END $$;
