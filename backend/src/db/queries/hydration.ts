import { supabase } from '../supabase.js';

export interface HydrationLog {
  id: string;
  date: string;
  amount_ml: number;
  logged_at: string;
}

export async function logWater(date: string, amount_ml: number): Promise<HydrationLog> {
  const { data, error } = await supabase
    .from('hydration_logs')
    .insert({ date, amount_ml })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getHydrationForDate(date: string): Promise<{ total_ml: number; logs: HydrationLog[] }> {
  const { data, error } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('date', date)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  const logs = data ?? [];
  const total_ml = logs.reduce((sum, l) => sum + l.amount_ml, 0);
  return { total_ml, logs };
}

export async function getHydrationForDateRange(from: string, to: string): Promise<HydrationLog[]> {
  const { data, error } = await supabase
    .from('hydration_logs')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
