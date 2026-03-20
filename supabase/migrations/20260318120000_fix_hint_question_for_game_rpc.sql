-- Fix: function mutates DB (INSERT) → must be VOLATILE, not STABLE.
-- Fix: avoid output column name "text" (PL/pgSQL / PostgREST ambiguity).
-- Grant: anon/authenticated can call RPC (same pattern as other game RPCs).
-- Must DROP first because return type (text → question_text) changes.

DROP FUNCTION IF EXISTS public.get_random_hint_question_for_game(uuid);

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
BEGIN
  LOOP
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
IS 'Returns one random unused hint question for a game; records usage. VOLATILE (writes DB).';

GRANT EXECUTE ON FUNCTION public.get_random_hint_question_for_game(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_random_hint_question_for_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_hint_question_for_game(uuid) TO service_role;
