-- =============================================================================
-- Доп. поля для действий шпиона: угадывание / убийство.
-- =============================================================================

-- 1. Игровые флаги: какое действие уже использовано в текущей игре
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS spy_action_type text,          -- 'guess' | 'kill'
  ADD COLUMN IF NOT EXISTS spy_action_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_spy_kill_target uuid;

COMMENT ON COLUMN public.games.spy_action_type IS 'Какое действие шпиона уже использовано в этом раунде: guess (угадал локацию) или kill (устранил игрока). NULL = ещё не действовал.';
COMMENT ON COLUMN public.games.spy_action_used_at IS 'Когда шпион впервые использовал действие (guess/kill) в этом раунде.';
COMMENT ON COLUMN public.games.last_spy_kill_target IS 'Последняя цель KILL: id игрока, которого устранил шпион.';

-- 2. Причина смерти игрока: изгнали голосованием или убил шпион
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS death_reason text;

COMMENT ON COLUMN public.players.death_reason IS 'NULL = жив, voted = изгнан голосованием, killed = убит шпионом.';

