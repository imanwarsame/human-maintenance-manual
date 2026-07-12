CREATE TABLE wellness_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date                DATE NOT NULL UNIQUE,
  sleep_duration_mins INTEGER,
  sleep_score         INTEGER,
  resting_hr          INTEGER,
  hrv                 NUMERIC(5,1),
  vo2_max             NUMERIC(4,1),
  steps               INTEGER,
  raw_json            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON wellness_logs (date);

ALTER TABLE wellness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon" ON wellness_logs FOR ALL TO anon USING (false);
