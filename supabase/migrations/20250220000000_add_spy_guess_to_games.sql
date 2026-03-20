-- Состояние угадывания локации шпионом: авто-вин (Fuse) или голосование мирных.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS spy_guess_text text,
  ADD COLUMN IF NOT EXISTS spy_guess_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS spy_guess_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS spy_guess_ends_at timestamptz;

COMMENT ON COLUMN public.games.spy_guess_text IS 'Текст, который ввёл шпион (вариант локации).';
COMMENT ON COLUMN public.games.spy_guess_status IS 'none | auto_win | voting | accepted | rejected. auto_win = засчитано по Fuse; voting = голосование мирных; accepted/rejected = итог голосования.';
COMMENT ON COLUMN public.games.spy_guess_started_at IS 'Момент когда шпион нажал "Угадать локацию".';
COMMENT ON COLUMN public.games.spy_guess_ends_at IS 'До этого времени показываем сплэш (10 сек авто-вин или vote_duration для голосования).';

-- Голоса мирных по текущему угадыванию (УГАДАЛ / НЕТ). Один раунд на комнату — при новом spy_guess старые удаляем.
CREATE TABLE IF NOT EXISTS public.spy_guess_votes (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('yes', 'no')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, player_id)
);

COMMENT ON TABLE public.spy_guess_votes IS 'Голоса мирных по угадыванию локации шпионом (УГАДАЛ=yes, НЕТ=no).';
