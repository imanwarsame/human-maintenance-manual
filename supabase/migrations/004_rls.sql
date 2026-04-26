-- Enable RLS on all tables (service role bypasses RLS automatically)
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_context ENABLE ROW LEVEL SECURITY;

-- Block all anonymous access
CREATE POLICY "no_anon" ON hydration_logs FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON activities FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON meal_plans FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON meal_completions FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON meal_deviations FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON coaching_notes FOR ALL TO anon USING (false);
CREATE POLICY "no_anon" ON plan_context FOR ALL TO anon USING (false);
