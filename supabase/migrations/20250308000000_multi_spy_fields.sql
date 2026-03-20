-- =============================================================================
-- Поля для режима «Сеть шпионов» (mode_multi_spy): попытки угадать по шпиону,
-- несколько финальных голосований и заголовки.
-- =============================================================================

-- Кто из шпионов уже использовал попытку «Угадать локацию» (по одному разу на шпиона)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS spy_guess_used_by uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.games.spy_guess_used_by IS 'id шпионов, уже использовавших попытку угадать локацию (по одному разу на шпиона в режиме с несколькими шпионами).';

-- Номер текущего финального голосования (1 = первый шпион, 2 = второй, …)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS final_spy_index integer;

COMMENT ON COLUMN public.games.final_spy_index IS 'При финальном голосовании: какой по счёту шпион (1 = первый, 2 = второй). NULL при одном шпионе или до финала.';

-- Сколько шпионов было в начале финальной фазы (для заголовка «Осталось найти: N»)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS total_final_spies integer;

COMMENT ON COLUMN public.games.total_final_spies IS 'Количество шпионов на старте финального голосования (для UI «Осталось найти: N»).';
