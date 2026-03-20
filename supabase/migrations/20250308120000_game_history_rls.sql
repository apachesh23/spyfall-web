-- Публичное чтение game_history по share_hash (любой с ссылкой может открыть)
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_history_public_read"
  ON public.game_history
  FOR SELECT
  USING (true);
