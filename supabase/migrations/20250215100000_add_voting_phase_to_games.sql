-- Мелкие фазы внутри глобального голосования (voting_status = 'active').
-- Сплэш открыт пока voting_status = 'active'; закрывается только после ack-result.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS voting_phase text,
  ADD COLUMN IF NOT EXISTS voting_result_ends_at timestamptz;

COMMENT ON COLUMN public.games.voting_phase IS 'Микро-фаза: collecting | result_no_vote | result_winner | result_tie | revote | revote_result_no_vote | revote_result_winner. null = нет экрана результата.';
COMMENT ON COLUMN public.games.voting_result_ends_at IS 'До этого момента показываем экран результата (5с); после — клиент вызывает ack-result.';
