import { supabase } from '../supabase.js';

export type ActivitySource = 'strava' | 'garmin' | 'manual';

export interface Activity {
  id: string;
  date: string;
  type: string;
  source: ActivitySource;
  duration_mins: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  raw_json: Record<string, unknown> | null;
  notes: string | null;
  external_id: string | null;
}

export interface CreateActivityInput {
  date: string;
  type: string;
  source: ActivitySource;
  duration_mins?: number;
  distance_km?: number;
  avg_hr?: number;
  raw_json?: Record<string, unknown>;
  notes?: string;
  external_id?: string;
}

export async function logActivity(input: CreateActivityInput): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertActivity(input: CreateActivityInput): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .upsert(input, { onConflict: 'source,external_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getActivities(limit = 20): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getActivitiesForDate(date: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('date', date)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getActivitiesForDateRange(from: string, to: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
