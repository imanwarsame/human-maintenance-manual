import { supabase } from '../supabase.js';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type CreatedBy = 'claude' | 'manual';
export type DeviationType = 'skipped' | 'swapped' | 'ate_out' | 'extras';

export interface MealPlan {
  id: string;
  date: string;
  meal_type: MealType;
  meal_name: string;
  description: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  prep_notes: string | null;
  created_by: CreatedBy;
  created_at: string;
}

export interface MealCompletion {
  id: string;
  meal_plan_id: string;
  eaten_at: string;
}

export interface MealDeviation {
  id: string;
  meal_plan_id: string | null;
  date: string;
  description: string;
  kcal: number | null;
  protein_g: number | null;
  deviation_type: DeviationType;
  logged_at: string;
}

export interface MealPlanWithStatus extends MealPlan {
  completion: MealCompletion | null;
  deviations: MealDeviation[];
}

export interface CreateMealPlanInput {
  date: string;
  meal_type: MealType;
  meal_name: string;
  description?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  prep_notes?: string;
  created_by?: CreatedBy;
}

export async function writeMealPlan(meals: CreateMealPlanInput[]): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(meals)
    .select();
  if (error) throw error;
  return data;
}

export async function updateMealPlan(id: string, updates: Partial<CreateMealPlanInput>): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMealPlansForDate(date: string): Promise<MealPlanWithStatus[]> {
  const { data: plans, error: plansErr } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('date', date)
    .order('meal_type', { ascending: true });
  if (plansErr) throw plansErr;
  if (!plans || plans.length === 0) return [];

  const ids = plans.map((p) => p.id);

  const [{ data: completions, error: compErr }, { data: deviations, error: devErr }] = await Promise.all([
    supabase.from('meal_completions').select('*').in('meal_plan_id', ids),
    supabase.from('meal_deviations').select('*').in('meal_plan_id', ids),
  ]);
  if (compErr) throw compErr;
  if (devErr) throw devErr;

  return plans.map((plan) => ({
    ...plan,
    completion: completions?.find((c) => c.meal_plan_id === plan.id) ?? null,
    deviations: deviations?.filter((d) => d.meal_plan_id === plan.id) ?? [],
  }));
}

export async function getMealPlansForDateRange(from: string, to: string): Promise<MealPlanWithStatus[]> {
  const { data: plans, error: plansErr } = await supabase
    .from('meal_plans')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (plansErr) throw plansErr;
  if (!plans || plans.length === 0) return [];

  const ids = plans.map((p) => p.id);

  const [{ data: completions, error: compErr }, { data: deviations, error: devErr }] = await Promise.all([
    supabase.from('meal_completions').select('*').in('meal_plan_id', ids),
    supabase.from('meal_deviations').select('*').in('meal_plan_id', ids),
  ]);
  if (compErr) throw compErr;
  if (devErr) throw devErr;

  return plans.map((plan) => ({
    ...plan,
    completion: completions?.find((c) => c.meal_plan_id === plan.id) ?? null,
    deviations: deviations?.filter((d) => d.meal_plan_id === plan.id) ?? [],
  }));
}

export async function markMealEaten(meal_plan_id: string, eaten_at: string): Promise<MealCompletion> {
  const { data, error } = await supabase
    .from('meal_completions')
    .insert({ meal_plan_id, eaten_at })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface CreateDeviationInput {
  meal_plan_id?: string;
  date: string;
  description: string;
  kcal?: number;
  protein_g?: number;
  deviation_type: DeviationType;
}

export async function logMealDeviation(input: CreateDeviationInput): Promise<MealDeviation> {
  const { data, error } = await supabase
    .from('meal_deviations')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDeviationsForDateRange(from: string, to: string): Promise<MealDeviation[]> {
  const { data, error } = await supabase
    .from('meal_deviations')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
