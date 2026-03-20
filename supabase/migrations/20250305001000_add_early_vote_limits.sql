-- Ограничения для досрочного голосования:
-- 1) Первое досрочное голосование доступно через 3 минуты активной игры.
-- 2) Всего 2 досрочных голосования за игру.
-- 3) Коллдаун между досрочными голосованиями 3 минуты (по активному времени игры).
--
-- early_vote_used_count      — сколько досрочных голосований уже было запущено.
-- early_vote_available_at    — когда можно запускать следующее (started_at + 3 мин,
--                              затем now + 3 мин после каждого запуска; при resume
--                              сдвигается на длительность паузы).

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS early_vote_used_count integer DEFAULT 0;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS early_vote_available_at timestamptz;

COMMENT ON COLUMN public.games.early_vote_used_count IS 'Сколько раз было запущено досрочное голосование (0..2).';

COMMENT ON COLUMN public.games.early_vote_available_at IS 'Когда можно запускать следующее досрочное голосование (учитывает паузы через /game/resume).';

