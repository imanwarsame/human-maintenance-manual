import { supabase } from '../supabase.js';

export type ActivitySource = 'strava' | 'garmin' | 'manual';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  completed?: boolean;
  skipped?: boolean;
}

export interface RunInterval {
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown';
  distance_km: number;
  pace_min_per_km: string;
  repeats?: number;
}

export interface RunPlan {
  total_distance_km: number;
  target_pace_min_per_km: string;
  intervals?: RunInterval[];
}

export interface ActivityRawJson {
  exercises?: Exercise[];
  run_plan?: RunPlan;
  [key: string]: unknown;
}

export interface Activity {
  id: string;
  date: string;
  type: string;
  source: ActivitySource;
  duration_mins: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  raw_json: ActivityRawJson | null;
  notes: string | null;
  external_id: string | null;
  is_planned: boolean;
}

export interface CreateActivityInput {
  date: string;
  type: string;
  source: ActivitySource;
  duration_mins?: number;
  distance_km?: number;
  avg_hr?: number;
  raw_json?: ActivityRawJson;
  notes?: string;
  external_id?: string;
  is_planned?: boolean;
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

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteActivitiesForDate(date: string): Promise<number> {
  const { data, error } = await supabase
    .from('activities')
    .delete()
    .eq('date', date)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function deleteActivitiesForDateRange(from: string, to: string): Promise<number> {
  const { data, error } = await supabase
    .from('activities')
    .delete()
    .gte('date', from)
    .lte('date', to)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function deletePlannedActivitiesForDateAndType(
  date: string,
  type: string,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('date', date)
    .eq('type', type)
    .eq('is_planned', true);
  if (error) throw error;
}

export async function getManualActivitiesForDateAndType(
  date: string,
  type: string,
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('date', date)
    .eq('type', type)
    .eq('source', 'manual');
  if (error) throw error;
  return data ?? [];
}

export async function deleteManualActivitiesForDateAndType(
  date: string,
  type: string,
): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('date', date)
    .eq('type', type)
    .eq('source', 'manual');
  if (error) throw error;
}

export async function getActivityByExternalId(externalId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('external_id', externalId)
    .eq('source', 'strava')
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateActivity(
  id: string,
  updates: Partial<Omit<CreateActivityInput, 'source' | 'external_id'>>
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
