import { supabase } from '../supabase.js';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type CreatedBy = 'claude' | 'manual';

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

export interface MealPlanWithStatus extends MealPlan {
  completion: MealCompletion | null;
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

  const { data: completions, error: compErr } = await supabase
    .from('meal_completions')
    .select('*')
    .in('meal_plan_id', ids);
  if (compErr) throw compErr;

  return plans.map((plan) => ({
    ...plan,
    completion: completions?.find((c) => c.meal_plan_id === plan.id) ?? null,
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

  const { data: completions, error: compErr } = await supabase
    .from('meal_completions')
    .select('*')
    .in('meal_plan_id', ids);
  if (compErr) throw compErr;

  return plans.map((plan) => ({
    ...plan,
    completion: completions?.find((c) => c.meal_plan_id === plan.id) ?? null,
  }));
}

export async function markMealEaten(meal_plan_id: string, eaten_at: string): Promise<MealCompletion> {
  const { data, error } = await supabase
    .from('meal_completions')
    .upsert({ meal_plan_id, eaten_at }, { onConflict: 'meal_plan_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMealPlan(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteMealsForDate(date: string): Promise<number> {
  const { data, error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('date', date)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
