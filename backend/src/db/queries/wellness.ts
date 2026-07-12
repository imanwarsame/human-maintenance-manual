import { supabase } from '../supabase.js';

export interface WellnessLog {
  id: string;
  date: string;
  sleep_duration_mins: number | null;
  sleep_score: number | null;
  resting_hr: number | null;
  hrv: number | null;
  vo2_max: number | null;
  steps: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertWellnessInput {
  date: string;
  sleep_duration_mins?: number | null;
  sleep_score?: number | null;
  resting_hr?: number | null;
  hrv?: number | null;
  vo2_max?: number | null;
  steps?: number | null;
  raw_json?: Record<string, unknown>;
}

export async function getWellnessLogs(from?: string, to?: string): Promise<WellnessLog[]> {
  let query = supabase
    .from('wellness_logs')
    .select('id, date, sleep_duration_mins, sleep_score, resting_hr, hrv, vo2_max, steps, created_at, updated_at')
    .order('date', { ascending: true });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function upsertWellness(input: UpsertWellnessInput): Promise<WellnessLog> {
  const { data, error } = await supabase
    .from('wellness_logs')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'date' })
    .select('id, date, sleep_duration_mins, sleep_score, resting_hr, hrv, vo2_max, steps, created_at, updated_at')
    .single();
  if (error) throw error;
  return data;
}
