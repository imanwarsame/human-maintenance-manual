-- Optional manual override for session intensity, used by training-load (ACWR) computation
-- when heart-rate data under-represents effort (e.g. football, strength work).
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS session_rpe SMALLINT CHECK (session_rpe BETWEEN 1 AND 10);
