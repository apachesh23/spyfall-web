-- =============================================================================
-- Словарь вопросов-подсказок для блока «Что спросить?» в игре.
-- При каждом открытии поповера выбирается один случайный вопрос (ORDER BY random() LIMIT 1).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hint_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.hint_questions IS 'Вопросы-подсказки для игроков (200–300 шт.). Выбор случайного при открытии поповера.';

-- Чтение разрешено всем (игра без обязательного входа), запись только через сервис/миграции
ALTER TABLE public.hint_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hint_questions_select_all"
  ON public.hint_questions
  FOR SELECT
  USING (true);

-- Вставка/обновление/удаление только для service_role (через dashboard или API с ключом)
-- Клиент не пишет в эту таблицу, поэтому отдельную policy на INSERT/UPDATE/DELETE не даём — только service_role по умолчанию.

-- Функция для выбора одного случайного вопроса (вызов из API / RPC)
CREATE OR REPLACE FUNCTION public.get_random_hint_question()
RETURNS TABLE (text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hq.text
  FROM public.hint_questions hq
  ORDER BY random()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_random_hint_question() IS 'Возвращает один случайный вопрос из словаря подсказок (для блока «Что спросить?»).';

-- =============================================================================
-- Примеры: как добавлять вопросы в базу
-- =============================================================================
-- Один вопрос:
--   INSERT INTO public.hint_questions (text) VALUES ('Как часто ты бываешь в таком месте?');
--
-- Несколько вопросов одним запросом:
--   INSERT INTO public.hint_questions (text) VALUES
--     ('Ты бывал здесь в прошлом году?'),
--     ('Это место популярно у туристов?'),
--     ('Ты пришёл сюда один или с кем-то?');
--
-- Из файла (psql или Supabase SQL Editor): подготовьте 200–300 строк и вставьте так же через VALUES.
