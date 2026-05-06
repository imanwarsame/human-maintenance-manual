ALTER TABLE body_weight_logs
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg NUMERIC(5,2);
