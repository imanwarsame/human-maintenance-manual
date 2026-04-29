import { supabase } from '../supabase.js';

export interface BodyWeightLog {
  id: string;
  date: string;
  weight_kg: number;
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

export async function upsertBodyWeight(date: string, weight_kg: number): Promise<BodyWeightLog> {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .upsert({ date, weight_kg }, { onConflict: 'date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
