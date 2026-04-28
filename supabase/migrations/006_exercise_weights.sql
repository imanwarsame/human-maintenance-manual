CREATE TABLE exercise_weights (
  exercise_name TEXT PRIMARY KEY,
  weight_kg     NUMERIC(5, 2) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE exercise_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon" ON exercise_weights FOR ALL TO anon USING (false);
