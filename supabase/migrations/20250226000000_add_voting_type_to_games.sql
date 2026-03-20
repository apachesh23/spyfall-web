-- Тип голосования: досрочное (по кнопкам) или финальное (по таймеру).
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS voting_type text DEFAULT 'early';

COMMENT ON COLUMN public.games.voting_type IS 'early = досрочное голосование, final = финальное (по таймеру).';
