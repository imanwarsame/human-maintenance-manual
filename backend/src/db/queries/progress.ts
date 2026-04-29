import { getActivitiesForDateRange } from './activities.js';

const MUSCLE_PATTERNS: { pattern: RegExp; group: string }[] = [
  { pattern: /bench\s?press|chest\s?press|cable\s?fly|pec\s?deck|push.?up|dip/i, group: 'Chest' },
  { pattern: /pull.?up|chin.?up|lat\s?pull|t-bar|face\s?pull|row|deadlift/i, group: 'Back' },
  { pattern: /squat|leg\s?press|lunge|rdl|romanian|hamstring|leg\s?curl|leg\s?ext|calf|hip\s?thrust|glute|bulgarian/i, group: 'Legs' },
  { pattern: /overhead\s?press|ohp|shoulder\s?press|military|lateral\s?raise|front\s?raise|upright\s?row|arnold/i, group: 'Shoulders' },
  { pattern: /bicep|hammer\s?curl|preacher|concentration\s?curl|incline\s?curl/i, group: 'Biceps' },
  { pattern: /tricep|skull\s?crusher|close\s?grip|pushdown|overhead\s?ext/i, group: 'Triceps' },
  { pattern: /plank|crunch|sit.?up|leg\s?raise|russian\s?twist|cable\s?crunch/i, group: 'Core' },
];

function getMuscleGroup(name: string): string {
  for (const { pattern, group } of MUSCLE_PATTERNS) {
    if (pattern.test(name)) return group;
  }
  // Generic "curl" fallback — likely bicep if not already matched above
  if (/curl/i.test(name)) return 'Biceps';
  return 'Other';
}

export interface VolumeByMuscle {
  muscle_group: string;
  volume: number;
  sets: number;
}

export async function getWeeklyVolumeByMuscleGroup(from: string, to: string): Promise<VolumeByMuscle[]> {
  const activities = await getActivitiesForDateRange(from, to);
  const strength = activities.filter(
    (a) => a.type === 'strength' && !a.is_planned && a.raw_json?.exercises?.length,
  );

  const groups: Record<string, { volume: number; sets: number }> = {};
  for (const activity of strength) {
    for (const ex of activity.raw_json!.exercises!) {
      const group = getMuscleGroup(ex.name);
      if (!groups[group]) groups[group] = { volume: 0, sets: 0 };
      groups[group].volume += ex.sets * (ex.reps ?? 1) * (ex.weight_kg ?? 0);
      groups[group].sets += ex.sets;
    }
  }

  return Object.entries(groups)
    .map(([muscle_group, { volume, sets }]) => ({ muscle_group, volume, sets }))
    .sort((a, b) => b.volume - a.volume);
}

export interface ExerciseHistoryEntry {
  date: string;
  weight_kg: number;
}

export interface ExerciseHistory {
  name: string;
  pr_kg: number;
  history: ExerciseHistoryEntry[];
}

export async function getExerciseHistory(from: string, to: string): Promise<ExerciseHistory[]> {
  const activities = await getActivitiesForDateRange(from, to);
  const strength = activities
    .filter((a) => a.type === 'strength' && !a.is_planned && a.raw_json?.exercises?.length)
    .sort((a, b) => a.date.localeCompare(b.date));

  const map: Record<string, ExerciseHistoryEntry[]> = {};
  for (const activity of strength) {
    for (const ex of activity.raw_json!.exercises!) {
      if (!ex.weight_kg) continue;
      if (!map[ex.name]) map[ex.name] = [];
      const existing = map[ex.name].find((e) => e.date === activity.date);
      if (existing) {
        if (ex.weight_kg > existing.weight_kg) existing.weight_kg = ex.weight_kg;
      } else {
        map[ex.name].push({ date: activity.date, weight_kg: ex.weight_kg });
      }
    }
  }

  return Object.entries(map)
    .filter(([, history]) => history.length > 0)
    .map(([name, history]) => ({
      name,
      pr_kg: Math.max(...history.map((h) => h.weight_kg)),
      history,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface RunTimeEntry {
  date: string;
  elapsed_secs: number;
  distance_km: number;
}

type BestEffort = { name: string; elapsed_time: number; distance: number };

export async function getRunTimes(from: string, to: string): Promise<RunTimeEntry[]> {
  const activities = await getActivitiesForDateRange(from, to);
  const runs = activities
    .filter((a) => a.type === 'run' && !a.is_planned && a.raw_json)
    .sort((a, b) => a.date.localeCompare(b.date));

  const results: RunTimeEntry[] = [];
  for (const activity of runs) {
    const raw = activity.raw_json as Record<string, unknown>;
    const bestEfforts = raw?.best_efforts as BestEffort[] | undefined;
    if (bestEfforts) {
      const fiveK = bestEfforts.find((e) => /^(best )?5k$/i.test(e.name.trim()));
      if (fiveK) {
        results.push({ date: activity.date, elapsed_secs: fiveK.elapsed_time, distance_km: 5.0 });
        continue;
      }
    }
    // Fallback: standalone ~5km run
    if (
      activity.distance_km &&
      activity.distance_km >= 4.8 &&
      activity.distance_km <= 5.2 &&
      activity.duration_mins
    ) {
      results.push({
        date: activity.date,
        elapsed_secs: Math.round(activity.duration_mins * 60),
        distance_km: activity.distance_km,
      });
    }
  }

  return results;
}
