-- Allow editing a meal's logged time by upserting on meal_plan_id instead of
-- inserting duplicate completion rows. Dedupe any existing duplicates first,
-- keeping the most recent eaten_at per meal plan.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY meal_plan_id ORDER BY eaten_at DESC, id DESC
  ) AS rn
  FROM meal_completions
)
DELETE FROM meal_completions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE meal_completions
  ADD CONSTRAINT meal_completions_meal_plan_id_key UNIQUE (meal_plan_id);
