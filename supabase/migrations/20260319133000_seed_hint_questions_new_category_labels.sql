-- Seed: one baseline hint question per current category set.
-- Safe to run multiple times (inserts only missing exact pairs).

WITH seed_questions(text, category_key) AS (
  VALUES
    ('Что здесь обычно делают в первую очередь?', 'actions'),
    ('Кого в этом месте можно встретить чаще всего?', 'people'),
    ('Какая зона в этом месте самая важная?', 'space'),
    ('Какое настроение чаще всего чувствуется здесь?', 'atmosphere'),
    ('Какой предмет здесь сразу бросается в глаза?', 'items'),
    ('Какое правило тут нарушать нельзя?', 'restrictions'),
    ('В какое время это место максимально оживлённое?', 'time'),
    ('Что нужно подготовить заранее перед входом сюда?', 'preparation')
)
INSERT INTO public.hint_questions (text, category_key)
SELECT s.text, s.category_key
FROM seed_questions s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.hint_questions hq
  WHERE hq.text = s.text
    AND hq.category_key = s.category_key
);
