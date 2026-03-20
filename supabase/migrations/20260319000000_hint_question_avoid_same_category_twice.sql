-- Не показывать подряд два вопроса из одной категории, если в партии ещё есть
-- неиспользованные вопросы хотя бы из одной другой категории. Иначе — полный пул.

CREATE OR REPLACE FUNCTION public.get_random_hint_question_for_game(p_game_id uuid)
RETURNS TABLE(category_key text, question_text text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  v_rows_updated int := 0;
  v_last_category text;
  v_avoid_same_category boolean := false;
BEGIN
  -- Последняя показанная категория в этой партии
  SELECT hq.category_key
    INTO v_last_category
    FROM public.hint_question_usages u
    JOIN public.hint_questions hq ON hq.id = u.hint_question_id
    WHERE u.game_id = p_game_id
    ORDER BY u.used_at DESC, u.hint_question_id DESC
    LIMIT 1;

  -- Есть ли среди неиспользованных вопросы из других категорий?
  IF v_last_category IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.hint_questions hq
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.hint_question_usages u
        WHERE u.game_id = p_game_id
          AND u.hint_question_id = hq.id
      )
      AND hq.category_key IS DISTINCT FROM v_last_category
    )
    INTO v_avoid_same_category;
  END IF;

  LOOP
    IF v_avoid_same_category THEN
      SELECT hq.id, hq.category_key, hq.text AS qtext
        INTO q
        FROM public.hint_questions hq
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.hint_question_usages u
          WHERE u.game_id = p_game_id
            AND u.hint_question_id = hq.id
        )
        AND hq.category_key IS DISTINCT FROM v_last_category
        ORDER BY random()
        LIMIT 1;
      IF q.id IS NULL THEN
        v_avoid_same_category := false;
        CONTINUE;
      END IF;
    ELSE
      SELECT hq.id, hq.category_key, hq.text AS qtext
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
    END IF;

    INSERT INTO public.hint_question_usages (game_id, hint_question_id)
    VALUES (p_game_id, q.id)
    ON CONFLICT (game_id, hint_question_id) DO NOTHING;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 1 THEN
      category_key := q.category_key;
      question_text := q.qtext;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_random_hint_question_for_game(p_game_id uuid)
IS 'Random unused hint per game; avoids same category twice in a row when other categories still have unused questions.';
