import type { Activity, Exercise, HydrationLog, HydrationSummary, MealPlan } from '../types/index.ts';
import type { BodyWeightEntry, ProgressData } from '../hooks/useProgress.ts';
import type { ReadinessSummary } from '../hooks/useReadiness.ts';
import type { ExerciseWeight } from '../hooks/useExerciseWeights.ts';
import type { AddMealInput } from '../hooks/useMealsForDate.ts';
import { generateDemoDataset, type DemoDataset } from './data.ts';
import { addDays, mondayOf, nextId, toDateStr } from './utils.ts';

let dataset: DemoDataset = generateDemoDataset();

export function resetDemoStore(): void {
  dataset = generateDemoDataset();
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function getHydrationSummary(date: string): HydrationSummary {
  const logs = dataset.hydrationLogs.filter((l) => l.date === date);
  return { total_ml: logs.reduce((s, l) => s + l.amount_ml, 0), logs };
}

export function getHydrationRange(from: string, to: string): HydrationLog[] {
  return dataset.hydrationLogs.filter((l) => inRange(l.date, from, to));
}

export function logWater(amount_ml: number, date: string): HydrationLog {
  const log: HydrationLog = { id: nextId('hyd'), date, amount_ml, logged_at: new Date().toISOString() };
  dataset.hydrationLogs.push(log);
  return log;
}

export function getActivities(): Activity[] {
  return dataset.activities;
}

export function getActivitiesRange(from: string, to: string): Activity[] {
  return dataset.activities.filter((a) => inRange(a.date, from, to));
}

export function dismissActivity(id: string): void {
  dataset.activities = dataset.activities.filter((a) => a.id !== id);
}

export function updateActivityExercises(id: string, exercises: Exercise[]): Activity | null {
  const activity = dataset.activities.find((a) => a.id === id);
  if (!activity) return null;
  activity.raw_json = { ...activity.raw_json, exercises };
  return activity;
}

export function getMealsForDate(date: string): MealPlan[] {
  return dataset.mealPlans.filter((m) => m.date === date);
}

export function getMealsRange(from: string, to: string): MealPlan[] {
  return dataset.mealPlans.filter((m) => inRange(m.date, from, to));
}

export function markMealEaten(mealId: string, eaten_at?: string): MealPlan | null {
  const meal = dataset.mealPlans.find((m) => m.id === mealId);
  if (!meal) return null;
  meal.completion = { id: nextId('comp'), meal_plan_id: mealId, eaten_at: eaten_at ?? new Date().toISOString() };
  return meal;
}

export function addMeal(body: AddMealInput): MealPlan {
  const meal: MealPlan = {
    id: nextId('meal'),
    date: body.date,
    meal_type: body.meal_type,
    meal_name: body.meal_name,
    description: body.description ?? null,
    kcal: body.kcal ?? null,
    protein_g: body.protein_g ?? null,
    carbs_g: body.carbs_g ?? null,
    fat_g: body.fat_g ?? null,
    prep_notes: body.prep_notes ?? null,
    created_by: 'manual',
    created_at: new Date().toISOString(),
    completion: null,
  };
  dataset.mealPlans.push(meal);
  return meal;
}

export function deleteMeal(id: string): { deleted: string } {
  dataset.mealPlans = dataset.mealPlans.filter((m) => m.id !== id);
  return { deleted: id };
}

export function getToday() {
  const dateStr = toDateStr(new Date());
  return {
    date: dateStr,
    hydration: getHydrationSummary(dateStr),
    meals: getMealsForDate(dateStr),
    activities: dataset.activities.filter((a) => a.date === dateStr),
  };
}

export function getWeek() {
  const now = new Date();
  const monday = mondayOf(now);
  const sunday = addDays(monday, 6);
  const from = toDateStr(monday);
  const to = toDateStr(sunday);
  return {
    from,
    to,
    hydrationLogs: getHydrationRange(from, to),
    meals: getMealsRange(from, to),
    activities: getActivitiesRange(from, to),
    coachingNotes: [dataset.coachingNoteToday, dataset.coachingNoteWeekly],
  };
}

export function getProgress(): ProgressData {
  return {
    weeklyVolume: dataset.weeklyVolume,
    exerciseHistory: dataset.exerciseHistory,
    runTimes: dataset.runTimes,
    bodyWeight: dataset.bodyWeight,
    wellness: dataset.wellness,
  };
}

export function logBodyWeight(payload: {
  date: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
}): BodyWeightEntry {
  const entry: BodyWeightEntry = {
    date: payload.date,
    weight_kg: payload.weight_kg,
    body_fat_pct: payload.body_fat_pct ?? null,
    muscle_mass_kg: payload.muscle_mass_kg ?? null,
  };
  const existingIdx = dataset.bodyWeight.findIndex((e) => e.date === payload.date);
  if (existingIdx >= 0) dataset.bodyWeight[existingIdx] = entry;
  else dataset.bodyWeight.push(entry);
  dataset.bodyWeight.sort((a, b) => (a.date < b.date ? -1 : 1));
  return entry;
}

export function getReadiness(): ReadinessSummary {
  return dataset.readinessSeries[dataset.readinessSeries.length - 1];
}

export function getReadinessSeries(from: string, to: string): ReadinessSummary[] {
  return dataset.readinessSeries.filter((r) => inRange(r.date, from, to));
}

export function getTrainingLoad() {
  return dataset.trainingLoad;
}

export function getCorrelations() {
  return dataset.correlations;
}

export function getExerciseWeights(): ExerciseWeight[] {
  return dataset.exerciseWeights;
}

export function updateExerciseWeights(weights: { exercise_name: string; weight_kg: number }[]): ExerciseWeight[] {
  for (const w of weights) {
    const existing = dataset.exerciseWeights.find((e) => e.exercise_name === w.exercise_name);
    if (existing) {
      existing.weight_kg = w.weight_kg;
      existing.updated_at = new Date().toISOString();
    } else {
      dataset.exerciseWeights.push({ exercise_name: w.exercise_name, weight_kg: w.weight_kg, updated_at: new Date().toISOString() });
    }
  }
  return dataset.exerciseWeights;
}

export function getPlanContext(key: string): { key: string; value: unknown } {
  return { key, value: dataset.planContext[key] ?? null };
}

export function setPlanContext(key: string, value: unknown): { key: string; value: unknown } {
  dataset.planContext[key] = value;
  return { key, value };
}

export function getCoachingNote(type: 'today' | 'weekly') {
  return type === 'today' ? dataset.coachingNoteToday : dataset.coachingNoteWeekly;
}
