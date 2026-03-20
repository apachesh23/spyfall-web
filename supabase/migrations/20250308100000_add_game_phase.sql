-- =============================================================================
-- Явная фаза игры: playing | voting | spy_guess | summary
-- Упрощает логику, MultiSpy и будущие режимы.
-- =============================================================================

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS phase character varying DEFAULT 'playing';

COMMENT ON COLUMN public.games.phase IS 'Фаза игры: playing, voting, spy_guess, summary.';
