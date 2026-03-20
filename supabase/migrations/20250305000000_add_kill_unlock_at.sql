-- Момент разблокировки кнопки УСТРАНИТЬ: 3 минуты активной игры (без учёта пауз).
-- При паузе не меняется; при resume сдвигается вперёд на длительность паузы.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS kill_unlock_at timestamptz;

COMMENT ON COLUMN public.games.kill_unlock_at IS 'Когда разблокируется KILL в режиме Скрытая угроза (started_at + 3 мин активной игры; при resume += длительность паузы).';
