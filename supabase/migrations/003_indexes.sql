CREATE INDEX ON hydration_logs (date);
CREATE INDEX ON activities (date);
CREATE INDEX ON activities (source, external_id);
CREATE INDEX ON meal_plans (date);
CREATE INDEX ON meal_completions (meal_plan_id);
CREATE INDEX ON meal_deviations (date);
CREATE INDEX ON coaching_notes (date, note_type);
CREATE INDEX ON plan_context (key);
