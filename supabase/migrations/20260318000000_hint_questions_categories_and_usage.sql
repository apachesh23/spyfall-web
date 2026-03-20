-- =============================================================================
-- Hint categories + per-game non-repetition
-- =============================================================================

-- 1) Add category key to the question pool
ALTER TABLE public.hint_questions
  ADD COLUMN IF NOT EXISTS category_key text NOT NULL DEFAULT 'atmosphere';

-- 2) Usage tracking per game (party)
CREATE TABLE IF NOT EXISTS public.hint_question_usages (
  game_id uuid NOT NULL,
  hint_question_id uuid NOT NULL REFERENCES public.hint_questions(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  PRIMARY KEY (game_id, hint_question_id)
);

-- 3) RPC: pick one random unused question for given game_id
-- Probability is weighted by remaining unused questions per category automatically,
-- because we sample from the union of all remaining unused questions.
CREATE OR REPLACE FUNCTION public.get_random_hint_question_for_game(p_game_id uuid)
RETURNS TABLE(category_key text, text text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  v_rows_updated int := 0;
BEGIN
  LOOP
    SELECT hq.id, hq.category_key, hq.text
      INTO q
      FROM public.hint_questions hq
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.hint_question_usages u
        WHERE u.game_id = p_game_id
          AND u.hint_question_id = hq.id
      )
      ORDER BY random()
      LIMIT 1;

    IF q.id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO public.hint_question_usages (game_id, hint_question_id)
    VALUES (p_game_id, q.id)
    ON CONFLICT (game_id, hint_question_id) DO NOTHING;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 1 THEN
      category_key := q.category_key;
      text := q.text;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_random_hint_question_for_game(p_game_id uuid)
IS 'Returns one random unused hint question for a specific game/party (by game_id).';

-- =============================================================================
-- 4) Seed test data (small pool per category)
-- =============================================================================
-- Category keys are stored in English (used internally / in DB).
-- Frontend maps them to Russian labels.

INSERT INTO public.hint_questions (text, category_key)
VALUES
  -- Атмосфера
  ('В воздухе чувствуется напряжение: что именно меняет атмосферу в этом месте?', 'atmosphere'),
  ('Что здесь делает людей более открытыми или наоборот настороженными?', 'atmosphere'),
  ('Какая деталь сильнее всего “держит” настроение локации?', 'atmosphere'),

  -- Люди
  ('Какие типы людей чаще всего встречаются в этом месте?', 'people'),
  ('Кто здесь обычно “главный” или наиболее заметный?', 'people'),
  ('Как ведут себя новички по сравнению с постоянными посетителями?', 'people'),

  -- Действия
  ('Что люди делают чаще всего, когда приходят сюда?', 'actions'),
  ('Какую активность здесь нельзя “пропустить” в течение дня?', 'actions'),
  ('Какие действия в этом месте считаются “обычными”, а какие необычными?', 'actions'),

  -- Ограничения
  ('Что здесь строго запрещено или ограничено по правилам?', 'restrictions'),
  ('Какие условия могут остановить привычную деятельность в этом месте?', 'restrictions'),
  ('Что мешает людям свободно действовать так, как им хочется?', 'restrictions'),

  -- Время
  ('Когда это место ощущается иначе всего: утром, днём или ночью?', 'time'),
  ('Есть ли “пиковые” часы, когда здесь особенно многолюдно?', 'time'),
  ('Как меняется поведение людей в зависимости от времени суток?', 'time'),

  -- Пространство
  ('Какая часть пространства наиболее важна для понимания локации?', 'space'),
  ('Как устроено взаимодействие людей с окружением: открыто или “по зонам”?', 'space'),
  ('Есть ли здесь визуальные ориентиры, по которым легко найти нужное место?', 'space'),

  -- Подготовка
  ('Что обычно нужно иметь с собой, чтобы чувствовать себя уверенно здесь?', 'preparation'),
  ('Какая подготовка помогает быстрее освоиться в этом месте?', 'preparation'),
  ('Что люди обычно делают заранее перед тем, как начать основное действие?', 'preparation');

