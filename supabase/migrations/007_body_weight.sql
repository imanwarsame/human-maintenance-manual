CREATE TABLE IF NOT EXISTS body_weight_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date       DATE NOT NULL UNIQUE,
  weight_kg  NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_weight_logs_date ON body_weight_logs(date);
