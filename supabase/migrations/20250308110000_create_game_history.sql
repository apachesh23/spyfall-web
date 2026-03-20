-- =============================================================================
-- Снимок итогов игры для публичной страницы /summary/[hash]
-- Создаётся при завершении партии, доступен любому по ссылке.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_hash character varying(24) NOT NULL UNIQUE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  location_id uuid,
  location_name text,
  theme text,
  spy_ids uuid[] DEFAULT '{}',
  winner character varying(32),
  started_at timestamptz,
  ended_at timestamptz,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.game_history IS 'Снимок итогов игры для публичной страницы. payload: players, voting_rounds, spy_actions.';
COMMENT ON COLUMN public.game_history.share_hash IS 'Короткий уникальный хэш для ссылки /summary/[hash].';
COMMENT ON COLUMN public.game_history.payload IS 'JSON: { players: [...], voting_rounds: [...], spy_actions: [...] }';

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_history_share_hash ON public.game_history(share_hash);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON public.game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

-- Функция генерации короткого хэша (12 hex-символов)
CREATE OR REPLACE FUNCTION public.gen_share_hash()
RETURNS character varying AS $$
  SELECT encode(gen_random_bytes(6), 'hex');
$$ LANGUAGE sql;
