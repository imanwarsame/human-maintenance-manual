ALTER TABLE body_weight_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_anon" ON body_weight_logs FOR ALL TO anon USING (false);
