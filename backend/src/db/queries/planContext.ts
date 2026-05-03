import { supabase } from '../supabase.js';

export interface PlanContextEntry {
  id: number;
  key: string;
  value_json: unknown;
  updated_at: string;
}

export async function getPlanContext(key: string): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('plan_context')
    .select('value_json')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.value_json ?? null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export async function getAllPlanContext(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('plan_context').select('key, value_json');
  if (error) throw error;
  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    const v = row.value_json;
    result[row.key] = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v;
  }
  return result;
}

export async function upsertPlanContext(key: string, value_json: unknown): Promise<PlanContextEntry> {
  const { data, error } = await supabase
    .from('plan_context')
    .upsert({ key, value_json, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
