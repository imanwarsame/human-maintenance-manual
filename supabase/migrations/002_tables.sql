CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE hydration_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE NOT NULL,
  amount_ml  INT NOT NULL CHECK (amount_ml > 0),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date           DATE NOT NULL,
  type           TEXT NOT NULL,
  source         activity_source_enum NOT NULL,
  duration_mins  INT,
  distance_km    NUMERIC(6,2),
  avg_hr         INT,
  raw_json       JSONB,
  notes          TEXT,
  external_id    TEXT,
  UNIQUE (source, external_id)
);

CREATE TABLE meal_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL,
  meal_type    meal_type_enum NOT NULL,
  meal_name    TEXT NOT NULL,
  description  TEXT,
  kcal         INT,
  protein_g    NUMERIC(6,1),
  carbs_g      NUMERIC(6,1),
  fat_g        NUMERIC(6,1),
  prep_notes   TEXT,
  created_by   created_by_enum NOT NULL DEFAULT 'claude',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_completions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  eaten_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_deviations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id   UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  date           DATE NOT NULL,
  description    TEXT NOT NULL,
  kcal           INT,
  protein_g      NUMERIC(6,1),
  deviation_type deviation_type_enum NOT NULL,
  logged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coaching_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         DATE NOT NULL,
  note_type    note_type_enum NOT NULL,
  content      TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_context (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value_json  JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
