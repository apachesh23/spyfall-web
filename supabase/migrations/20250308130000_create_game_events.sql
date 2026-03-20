-- =============================================================================
-- Лог событий игры: голосования, угадывания, действия шпиона и т.п.
-- Используется для построения "ХОДА ИГРЫ" на странице /summary/[hash].
-- =============================================================================

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null,
  payload jsonb not null
);

comment on table public.game_events is 'Поштучные события игры (голоса, действия шпиона и др.) для таймлайна.';
comment on column public.game_events.type is 'Тип события: vote_cast, early_vote_toggled, final_vote_started, vote_result, spy_guess_started, spy_guess_result, spy_kill и т.п.';
comment on column public.game_events.payload is 'JSON-параметры события (ids игроков, текст локации, счётчики голосов и т.п.).';

create index if not exists idx_game_events_game_id_created_at
  on public.game_events (game_id, created_at);

