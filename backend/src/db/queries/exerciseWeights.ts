import { supabase } from '../supabase.js';

export interface ExerciseWeight {
  exercise_name: string;
  weight_kg: number;
  updated_at: string;
}

export async function getExerciseWeights(): Promise<ExerciseWeight[]> {
  const { data, error } = await supabase
    .from('exercise_weights')
    .select('*')
    .order('exercise_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertExerciseWeights(
  weights: { exercise_name: string; weight_kg: number }[]
): Promise<void> {
  const rows = weights.map((w) => ({ ...w, updated_at: new Date().toISOString() }));
  const { error } = await supabase
    .from('exercise_weights')
    .upsert(rows, { onConflict: 'exercise_name' });
  if (error) throw error;
}
