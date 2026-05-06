import { supabase } from '../supabase.js';

export interface BodyWeightLog {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  created_at: string;
}

export async function getBodyWeightLogs(from?: string, to?: string): Promise<BodyWeightLog[]> {
  let query = supabase
    .from('body_weight_logs')
    .select('*')
    .order('date', { ascending: true });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function upsertBodyWeight(
  date: string,
  weight_kg: number,
  body_fat_pct?: number | null,
  muscle_mass_kg?: number | null,
): Promise<BodyWeightLog> {
  const payload: Record<string, unknown> = { date, weight_kg };
  if (body_fat_pct !== undefined) payload.body_fat_pct = body_fat_pct;
  if (muscle_mass_kg !== undefined) payload.muscle_mass_kg = muscle_mass_kg;
  const { data, error } = await supabase
    .from('body_weight_logs')
    .upsert(payload, { onConflict: 'date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
