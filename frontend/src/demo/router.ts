import type { Exercise } from '../types/index.ts';
import type { AddMealInput } from '../hooks/useMealsForDate.ts';
import * as store from './store.ts';

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 220));
}

// Matches "/api/activities/abc123" -> "abc123", but not "/api/activities" or
// "/api/activities/abc123/complete" (handled by their own matchers first).
function matchId(pathname: string, base: string): string | null {
  if (!pathname.startsWith(`${base}/`)) return null;
  const rest = pathname.slice(base.length + 1);
  return rest.includes('/') ? null : rest;
}

export async function handleDemoRequest<T>(path: string, method: string, body: unknown): Promise<T> {
  await wait();

  const url = new URL(path, 'http://demo.local');
  const { pathname } = url;
  const qp = url.searchParams;
  const m = method.toUpperCase();

  if (m === 'GET' && pathname === '/api/today') return store.getToday() as T;
  if (m === 'GET' && pathname === '/api/coaching-note/today') return store.getCoachingNote('today') as T;
  if (m === 'GET' && pathname === '/api/coaching-note/weekly') return store.getCoachingNote('weekly') as T;
  if (m === 'GET' && pathname === '/api/week') return store.getWeek() as T;
  if (m === 'GET' && pathname === '/api/progress') return store.getProgress() as T;
  if (m === 'GET' && pathname === '/api/readiness') return store.getReadiness() as T;
  if (m === 'GET' && pathname === '/api/readiness/series') {
    return store.getReadinessSeries(qp.get('from') ?? '', qp.get('to') ?? '') as T;
  }
  if (m === 'GET' && pathname === '/api/training-load') return store.getTrainingLoad() as T;
  if (m === 'GET' && pathname === '/api/correlations') return store.getCorrelations() as T;
  if (m === 'GET' && pathname === '/api/exercise-weights') return store.getExerciseWeights() as T;
  if (m === 'PATCH' && pathname === '/api/exercise-weights') {
    const b = body as { weights: { exercise_name: string; weight_kg: number }[] };
    return store.updateExerciseWeights(b.weights) as T;
  }

  if (m === 'GET' && pathname === '/api/hydration') {
    const date = qp.get('date');
    const from = qp.get('from');
    const to = qp.get('to');
    if (date) return store.getHydrationSummary(date) as T;
    return store.getHydrationRange(from ?? '', to ?? '') as T;
  }
  if (m === 'POST' && pathname === '/api/hydration') {
    const b = body as { amount_ml: number; date: string };
    return store.logWater(b.amount_ml, b.date) as T;
  }

  if (m === 'GET' && pathname === '/api/activities') {
    const from = qp.get('from');
    const to = qp.get('to');
    if (from && to) return store.getActivitiesRange(from, to) as T;
    return store.getActivities() as T;
  }
  const activityId = matchId(pathname, '/api/activities');
  if (activityId && m === 'DELETE') {
    store.dismissActivity(activityId);
    return undefined as T;
  }
  if (activityId && m === 'PATCH') {
    const b = body as { exercises: Exercise[] };
    return store.updateActivityExercises(activityId, b.exercises) as T;
  }
  if (pathname.startsWith('/api/activities/strava-raw/')) return {} as T;

  if (m === 'GET' && pathname === '/api/meals') {
    const date = qp.get('date');
    const from = qp.get('from');
    const to = qp.get('to');
    if (date) return store.getMealsForDate(date) as T;
    return store.getMealsRange(from ?? '', to ?? '') as T;
  }
  if (m === 'POST' && pathname === '/api/meals') return store.addMeal(body as AddMealInput) as T;
  const mealCompleteId = pathname.match(/^\/api\/meals\/([^/]+)\/complete$/)?.[1];
  if (mealCompleteId && m === 'POST') {
    const b = (body ?? {}) as { eaten_at?: string };
    return store.markMealEaten(mealCompleteId, b.eaten_at) as T;
  }
  const mealId = matchId(pathname, '/api/meals');
  if (mealId && m === 'DELETE') return store.deleteMeal(mealId) as T;

  if (m === 'POST' && pathname === '/api/body-weight') {
    return store.logBodyWeight(body as { date: string; weight_kg: number; body_fat_pct?: number | null; muscle_mass_kg?: number | null }) as T;
  }

  if (m === 'GET' && pathname === '/api/plan-context') {
    return store.getPlanContext(qp.get('key') ?? '') as T;
  }
  if (m === 'PUT' && pathname === '/api/plan-context') {
    const b = body as { key: string; value: unknown };
    return store.setPlanContext(b.key, b.value) as T;
  }

  if (pathname === '/api/push/subscribe' || pathname === '/api/push/unsubscribe') return {} as T;

  console.warn(`[demo mode] unhandled request: ${m} ${pathname}`);
  if (m === 'GET') return null as T;
  return {} as T;
}
