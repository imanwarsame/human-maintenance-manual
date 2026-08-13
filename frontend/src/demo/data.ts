import type { Activity, ActivitySource, CoachingNote, Exercise, HydrationLog, MealPlan, MealType, RunInterval } from '../types/index.ts';
import type {
  BodyWeightEntry,
  ExerciseHistory,
  RunTimeEntry,
  VolumeByMuscle,
  WellnessEntry,
} from '../hooks/useProgress.ts';
import type { ReadinessBand, ReadinessComponent, ReadinessSummary } from '../hooks/useReadiness.ts';
import type { AcwrBand, DailyLoad, TrainingLoadSummary } from '../hooks/useTrainingLoad.ts';
import type { CorrelationResult } from '../hooks/useCorrelations.ts';
import type { ExerciseWeight } from '../hooks/useExerciseWeights.ts';
import type { CommonMeal } from '../components/CommonMealPicker.tsx';
import { addDays, clamp, isoAt, jitter, mean, mulberry32, nextId, offsetDateStr, std, toDateStr } from './utils.ts';

export interface DemoDataset {
  hydrationLogs: HydrationLog[];
  mealPlans: MealPlan[];
  activities: Activity[];
  bodyWeight: BodyWeightEntry[];
  wellness: WellnessEntry[];
  exerciseWeights: ExerciseWeight[];
  exerciseHistory: ExerciseHistory[];
  runTimes: RunTimeEntry[];
  weeklyVolume: VolumeByMuscle[];
  correlations: CorrelationResult[];
  readinessSeries: ReadinessSummary[];
  trainingLoad: TrainingLoadSummary;
  coachingNoteToday: CoachingNote;
  coachingNoteWeekly: CoachingNote;
  planContext: Record<string, unknown>;
}

const REST_TYPES = new Set(['rest', 'mobility', 'cycling']);

const LIFTS = {
  backSquat: { name: 'Back Squat', start: 90, now: 102.5 },
  romanianDeadlift: { name: 'Romanian Deadlift', start: 80, now: 92.5 },
  benchPress: { name: 'Bench Press', start: 75, now: 85 },
  barbellRow: { name: 'Barbell Row', start: 60, now: 70 },
  overheadPress: { name: 'Overhead Press', start: 45, now: 55 },
  weightedPullup: { name: 'Weighted Pull-up', start: 10, now: 22.5 },
  walkingLunge: { name: 'Walking Lunge', start: 20, now: 26 },
};

function buildExerciseWeights(now: Date): ExerciseWeight[] {
  return Object.values(LIFTS).map((l, i) => ({
    exercise_name: l.name,
    weight_kg: l.now,
    updated_at: isoAt(offsetDateStr(-(2 + (i % 4)), now), 18, 30),
  }));
}

function buildExerciseHistory(now: Date): ExerciseHistory[] {
  const points = 7;
  const spanDays = 84;
  return Object.values(LIFTS).map((l) => {
    const history = Array.from({ length: points }, (_, i) => {
      const offset = -spanDays + Math.round((spanDays / (points - 1)) * i);
      const frac = i / (points - 1);
      const weight_kg = Math.round((l.start + (l.now - l.start) * frac) * 2) / 2;
      return { date: offsetDateStr(offset, now), weight_kg };
    });
    return { name: l.name, pr_kg: Math.max(...history.map((h) => h.weight_kg)), history };
  });
}

function buildWeeklyVolume(): VolumeByMuscle[] {
  const squat = LIFTS.backSquat.now * 6 * 4;
  const rdl = LIFTS.romanianDeadlift.now * 8 * 3;
  const row = LIFTS.barbellRow.now * 8 * 4;
  const pullup = LIFTS.weightedPullup.now * 6 * 3;
  const bench = LIFTS.benchPress.now * 6 * 4;
  const ohp = LIFTS.overheadPress.now * 8 * 3;
  return [
    { muscle_group: 'Legs', volume: Math.round(squat + rdl), sets: 7 },
    { muscle_group: 'Back', volume: Math.round(row + pullup), sets: 7 },
    { muscle_group: 'Chest', volume: Math.round(bench), sets: 4 },
    { muscle_group: 'Shoulders', volume: Math.round(ohp), sets: 3 },
    { muscle_group: 'Core', volume: 0, sets: 3 },
  ];
}

function buildRunTimes(now: Date): RunTimeEntry[] {
  const offsets = [-70, -56, -42, -28, -14, -3];
  const times = [1580, 1552, 1522, 1489, 1465, 1440];
  const distances = [5.02, 4.98, 5.05, 5.0, 5.03, 5.0];
  return offsets.map((o, i) => ({ date: offsetDateStr(o, now), elapsed_secs: times[i], distance_km: distances[i] }));
}

function buildBodyWeight(now: Date, rand: () => number): BodyWeightEntry[] {
  const points = 14;
  const spanDays = 84;
  const startW = 79.5, endW = 76.8;
  const startFat = 17.6, endFat = 15.3;
  const startMuscle = 61.2, endMuscle = 62.6;
  return Array.from({ length: points }, (_, i) => {
    const offset = -spanDays + Math.round((spanDays / (points - 1)) * i);
    const frac = i / (points - 1);
    const weight_kg = Math.round((startW + (endW - startW) * frac + jitter(rand, 0.3)) * 10) / 10;
    const hasComposition = i % 2 === 0;
    return {
      date: offsetDateStr(offset, now),
      weight_kg,
      body_fat_pct: hasComposition ? Math.round((startFat + (endFat - startFat) * frac) * 10) / 10 : null,
      muscle_mass_kg: hasComposition ? Math.round((startMuscle + (endMuscle - startMuscle) * frac) * 10) / 10 : null,
    };
  });
}

function buildWellness(now: Date, rand: () => number): WellnessEntry[] {
  return Array.from({ length: 30 }, (_, i) => {
    const offset = -29 + i;
    const date = offsetDateStr(offset, now);
    const vo2Frac = i / 29;
    return {
      date,
      sleep_duration_mins: Math.round(clamp(435 + jitter(rand, 40), 330, 520)),
      sleep_score: Math.round(clamp(78 + jitter(rand, 13), 45, 97)),
      resting_hr: Math.round(clamp(52 + jitter(rand, 4), 44, 62)),
      hrv: Math.round(clamp(62 + jitter(rand, 11), 32, 88)),
      vo2_max: offset % 7 === 0 ? Math.round((47.0 + 1.4 * vo2Frac) * 10) / 10 : null,
      steps: Math.round(clamp(8500 + jitter(rand, 3200), 2000, 16000)),
    };
  });
}

const DRIVER_LABEL: Record<string, { up: string; down: string }> = {
  sleep_duration_mins: { up: 'Solid sleep duration', down: 'Sleep running short' },
  sleep_score: { up: 'High sleep quality', down: 'Sleep quality dipped' },
  resting_hr: { up: 'Resting HR elevated', down: 'Resting HR settled' },
  hrv: { up: 'HRV above baseline', down: 'HRV below baseline' },
  vo2_max: { up: 'Aerobic fitness trending up', down: 'Aerobic fitness flat' },
};

const READINESS_WEIGHTS: { metric: Exclude<keyof WellnessEntry, 'date'>; label: string; weight: number; invert: boolean }[] = [
  { metric: 'sleep_duration_mins', label: 'Sleep duration', weight: 0.2, invert: false },
  { metric: 'sleep_score', label: 'Sleep quality', weight: 0.25, invert: false },
  { metric: 'resting_hr', label: 'Resting HR', weight: 0.2, invert: true },
  { metric: 'hrv', label: 'HRV', weight: 0.25, invert: false },
  { metric: 'vo2_max', label: 'VO2 max', weight: 0.1, invert: false },
];

function bandForScore(score: number): ReadinessBand {
  if (score < 50) return 'low';
  if (score < 65) return 'moderate';
  if (score < 82) return 'good';
  return 'prime';
}

function computeReadiness(date: string, wellness: WellnessEntry[], idx: number): ReadinessSummary {
  const entry = wellness[idx];
  const components: ReadinessComponent[] = [];
  for (const w of READINESS_WEIGHTS) {
    const value = entry[w.metric];
    if (value == null) continue;
    const series = wellness.map((e) => e[w.metric]).filter((v): v is number => v != null);
    if (series.length < 3) continue;
    const m = mean(series);
    const s = std(series) || 1;
    const zRaw = (value - m) / s;
    const z = w.invert ? -zRaw : zRaw;
    const sub_score = Math.round(clamp(50 + z * 15, 0, 100));
    components.push({
      metric: w.metric,
      label: w.label,
      value,
      baseline_mean: Math.round(m * 10) / 10,
      baseline_n: series.length,
      z: Math.round(z * 100) / 100,
      sub_score,
      weight: w.weight,
    });
  }
  const totalWeight = components.reduce((s, c) => s + c.weight, 0) || 1;
  const score = Math.round(components.reduce((s, c) => s + c.weight * c.sub_score, 0) / totalWeight);
  const drivers = [...components]
    .sort((a, b) => Math.abs(b.z ?? 0) - Math.abs(a.z ?? 0))
    .slice(0, 2)
    .map((c) => {
      const meta = DRIVER_LABEL[c.metric];
      if (!meta) return c.label;
      return (c.z ?? 0) >= 0 ? meta.up : meta.down;
    });
  return {
    date,
    score,
    band: bandForScore(score),
    confidence: components.length >= 3 && (components[0]?.baseline_n ?? 0) >= 14 ? 'high' : 'low',
    incident_modifier: 1,
    incident_reason: null,
    components,
    drivers,
  };
}

function buildReadinessSeries(wellness: WellnessEntry[], now: Date): ReadinessSummary[] {
  return wellness.map((_, i) => computeReadiness(offsetDateStr(-29 + i, now), wellness, i));
}

type DayKind = 'strength-legs' | 'strength-pull' | 'run-intervals' | 'run-long' | 'football' | 'mobility' | 'rest';

function kindForWeekday(dow: number): DayKind {
  switch (dow) {
    case 1: return 'strength-legs';
    case 2: return 'run-intervals';
    case 3: return 'mobility';
    case 4: return 'strength-pull';
    case 5: return 'football';
    case 6: return 'run-long';
    default: return 'rest';
  }
}

const LOAD_BY_KIND: Record<DayKind, number> = {
  'strength-legs': 300,
  'strength-pull': 280,
  'run-intervals': 260,
  'run-long': 340,
  football: 360,
  mobility: 70,
  rest: 0,
};

function activityTypeForKind(kind: DayKind): string {
  if (kind.startsWith('strength')) return 'strength';
  if (kind.startsWith('run')) return 'run';
  return kind;
}

const STRENGTH_NOTES = ['Felt strong, kept most sets around RPE 7.', 'Solid session, a touch fatigued going in.', 'Good bar speed today, no niggles.'];
const RUN_NOTES = ['Easy effort, focused on cadence.', 'Legs felt fresh, held pace comfortably.', 'A bit breezy out but pace held up.'];
const FOOTBALL_NOTES = ['5-a-side with the regular Friday crew.', 'Good tempo game, a few sharp turns.', 'Competitive one — legs felt it after.'];
const MOBILITY_NOTES = ['Hip flexor & thoracic mobility flow.', 'Short flow, focused on ankles and hips.'];

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function legsExercises(): Exercise[] {
  return [
    { name: LIFTS.backSquat.name, sets: 4, reps: 6, weight_kg: LIFTS.backSquat.now },
    { name: LIFTS.romanianDeadlift.name, sets: 3, reps: 8, weight_kg: LIFTS.romanianDeadlift.now },
    { name: LIFTS.walkingLunge.name, sets: 3, reps: 12, weight_kg: LIFTS.walkingLunge.now },
    { name: 'Hanging Knee Raise', sets: 3, reps: 15 },
  ];
}

function pullExercises(): Exercise[] {
  return [
    { name: LIFTS.benchPress.name, sets: 4, reps: 6, weight_kg: LIFTS.benchPress.now },
    { name: LIFTS.barbellRow.name, sets: 4, reps: 8, weight_kg: LIFTS.barbellRow.now },
    { name: LIFTS.overheadPress.name, sets: 3, reps: 8, weight_kg: LIFTS.overheadPress.now },
    { name: LIFTS.weightedPullup.name, sets: 3, reps: 6, weight_kg: LIFTS.weightedPullup.now },
  ];
}

function mobilityExercises(): Exercise[] {
  return [
    { name: 'Couch Stretch', sets: 2, reps: 8 },
    { name: '90/90 Hip Switch', sets: 2, reps: 10 },
  ];
}

const INTERVAL_SET: RunInterval[] = [
  { type: 'warmup', distance_km: 1.5, pace_min_per_km: '5:40' },
  { type: 'interval', distance_km: 1, pace_min_per_km: '4:15', repeats: 4 },
  { type: 'recovery', distance_km: 0.4, pace_min_per_km: '6:30', repeats: 4 },
  { type: 'cooldown', distance_km: 1, pace_min_per_km: '5:50' },
];

function buildActivities(now: Date, rand: () => number): Activity[] {
  const activities: Activity[] = [];
  for (let offset = -34; offset <= 10; offset++) {
    const date = addDays(now, offset);
    const dow = date.getDay();
    const kind = kindForWeekday(dow);
    if (kind === 'rest') continue;
    const dateStr = toDateStr(date);
    const isPlanned = offset >= 0;
    const type = activityTypeForKind(kind);
    const source: ActivitySource = isPlanned ? 'manual' : type === 'strength' || type === 'mobility' ? 'manual' : 'garmin';

    if (kind === 'strength-legs' || kind === 'strength-pull') {
      const exercises = (kind === 'strength-legs' ? legsExercises() : pullExercises()).map((ex) => ({
        ...ex,
        completed: !isPlanned,
      }));
      activities.push({
        id: nextId('act'),
        date: dateStr,
        type: 'strength',
        source,
        external_id: null,
        duration_mins: 55 + Math.round(jitter(rand, 8)),
        distance_km: null,
        avg_hr: isPlanned ? null : 122 + Math.round(jitter(rand, 8)),
        notes: pick(STRENGTH_NOTES, offset),
        is_planned: isPlanned,
        raw_json: { exercises },
      });
    } else if (kind === 'run-intervals' || kind === 'run-long') {
      const distance_km = kind === 'run-long' ? Math.round((8.5 + jitter(rand, 1)) * 10) / 10 : Math.round((6.2 + jitter(rand, 0.6)) * 10) / 10;
      const pace = kind === 'run-long' ? '5:25' : '4:55';
      if (isPlanned) {
        activities.push({
          id: nextId('act'),
          date: dateStr,
          type: 'run',
          source,
          external_id: null,
          duration_mins: Math.round(distance_km * 5.3),
          distance_km: null,
          avg_hr: null,
          notes: kind === 'run-intervals' ? '4x1km @ threshold, jog recovery.' : 'Steady aerobic long run.',
          is_planned: true,
          raw_json: {
            run_plan: {
              total_distance_km: distance_km,
              target_pace_min_per_km: pace,
              intervals: kind === 'run-intervals' ? INTERVAL_SET : undefined,
            },
          },
        });
      } else {
        const movingSecs = Math.round(distance_km * 60 * (kind === 'run-long' ? 5.42 : 4.92));
        activities.push({
          id: nextId('act'),
          date: dateStr,
          type: 'run',
          source,
          external_id: null,
          duration_mins: Math.round(movingSecs / 60),
          distance_km,
          avg_hr: 148 + Math.round(jitter(rand, 8)),
          notes: pick(RUN_NOTES, offset),
          is_planned: false,
          raw_json: {
            average_speed: Math.round((distance_km * 1000) / movingSecs * 100) / 100,
            average_cadence: 84 + Math.round(jitter(rand, 3)),
            total_elevation_gain: Math.round(clamp(30 + jitter(rand, 25), 0, 120)),
            calories: Math.round(distance_km * 62),
            max_heartrate: 168 + Math.round(jitter(rand, 6)),
            elapsed_time: movingSecs + 60,
            moving_time: movingSecs,
          },
        });
      }
    } else if (kind === 'football') {
      activities.push({
        id: nextId('act'),
        date: dateStr,
        type: 'football',
        source,
        external_id: null,
        duration_mins: 60,
        distance_km: null,
        avg_hr: isPlanned ? null : 151 + Math.round(jitter(rand, 6)),
        notes: pick(FOOTBALL_NOTES, offset),
        is_planned: isPlanned,
        raw_json: isPlanned ? null : { calories: 520 },
      });
    } else if (kind === 'mobility') {
      const exercises = isPlanned ? mobilityExercises().map((ex) => ({ ...ex, completed: false })) : undefined;
      activities.push({
        id: nextId('act'),
        date: dateStr,
        type: 'mobility',
        source,
        external_id: null,
        duration_mins: 25,
        distance_km: null,
        avg_hr: null,
        notes: pick(MOBILITY_NOTES, offset),
        is_planned: isPlanned,
        raw_json: exercises ? { exercises } : null,
      });
    }
  }
  return activities;
}

interface MealTemplate {
  name: string;
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_notes?: string;
}

const TRAINING_MENUS: Record<MealType, MealTemplate>[] = [
  {
    breakfast: { name: 'Protein oats', description: 'Oats, whey, banana, peanut butter', kcal: 520, protein_g: 36, carbs_g: 60, fat_g: 14 },
    lunch: { name: 'Chicken & rice power bowl', description: 'Grilled chicken thigh, jasmine rice, broccoli, tahini', kcal: 700, protein_g: 50, carbs_g: 72, fat_g: 18 },
    dinner: { name: 'Beef stir-fry & noodles', description: 'Lean beef, mixed veg, soy-ginger sauce', kcal: 680, protein_g: 46, carbs_g: 62, fat_g: 22 },
    snack: { name: 'Protein shake & almonds', description: 'Whey shake with a handful of almonds', kcal: 320, protein_g: 26, carbs_g: 18, fat_g: 16 },
  },
  {
    breakfast: { name: 'Greek yogurt & berries bowl', description: 'Greek yogurt, mixed berries, granola, honey', kcal: 420, protein_g: 32, carbs_g: 45, fat_g: 12 },
    lunch: { name: 'Turkey chilli & sweet potato', description: 'Turkey mince chilli over baked sweet potato', kcal: 640, protein_g: 44, carbs_g: 64, fat_g: 18, prep_notes: 'Batch-cooked, reheats well.' },
    dinner: { name: 'Salmon, quinoa & greens', description: 'Baked salmon, quinoa, tenderstem broccoli', kcal: 610, protein_g: 40, carbs_g: 48, fat_g: 26 },
    snack: { name: 'Cottage cheese & rice cakes', description: 'Cottage cheese, rice cakes, peanut butter', kcal: 300, protein_g: 18, carbs_g: 30, fat_g: 12 },
  },
  {
    breakfast: { name: 'Veggie & feta omelette', description: '3 eggs, spinach, feta, wholegrain toast', kcal: 390, protein_g: 28, carbs_g: 8, fat_g: 26 },
    lunch: { name: 'Tuna wholegrain wrap', description: 'Tuna, sweetcorn, light mayo, wholegrain wrap', kcal: 560, protein_g: 40, carbs_g: 54, fat_g: 16 },
    dinner: { name: 'Chicken fajita bowl', description: 'Chicken, peppers, onion, rice, salsa', kcal: 660, protein_g: 46, carbs_g: 60, fat_g: 24 },
    snack: { name: 'Protein shake & banana', description: 'Whey shake blended with banana', kcal: 280, protein_g: 25, carbs_g: 28, fat_g: 6 },
  },
];

const REST_MENUS: Record<MealType, MealTemplate>[] = [
  {
    breakfast: { name: 'Greek yogurt & berries bowl', description: 'Greek yogurt, mixed berries, granola, honey', kcal: 420, protein_g: 32, carbs_g: 45, fat_g: 12 },
    lunch: { name: 'Lentil & veg curry', description: 'Red lentil curry, brown rice', kcal: 520, protein_g: 26, carbs_g: 68, fat_g: 14 },
    dinner: { name: 'Salmon, quinoa & greens', description: 'Baked salmon, quinoa, tenderstem broccoli', kcal: 610, protein_g: 40, carbs_g: 48, fat_g: 26 },
    snack: { name: 'Cottage cheese & pineapple', description: 'Cottage cheese with fresh pineapple', kcal: 180, protein_g: 20, carbs_g: 16, fat_g: 3 },
  },
  {
    breakfast: { name: 'Veggie & feta omelette', description: '3 eggs, spinach, feta, wholegrain toast', kcal: 390, protein_g: 28, carbs_g: 8, fat_g: 26 },
    lunch: { name: 'Tuna wholegrain wrap', description: 'Tuna, sweetcorn, light mayo, wholegrain wrap', kcal: 560, protein_g: 40, carbs_g: 54, fat_g: 16 },
    dinner: { name: 'Lentil & veg curry', description: 'Red lentil curry, brown rice', kcal: 520, protein_g: 26, carbs_g: 68, fat_g: 14 },
    snack: { name: 'Rice cakes & peanut butter', description: 'Rice cakes with peanut butter', kcal: 220, protein_g: 7, carbs_g: 22, fat_g: 11 },
  },
];

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_HOURS: Record<MealType, number> = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 };

function buildMeals(now: Date): MealPlan[] {
  const meals: MealPlan[] = [];
  for (let offset = -14; offset <= 5; offset++) {
    const date = addDays(now, offset);
    const dow = date.getDay();
    const dateStr = toDateStr(date);
    const isTrainingDay = !REST_TYPES.has(activityTypeForKind(kindForWeekday(dow))) && kindForWeekday(dow) !== 'rest';
    const menuSet = isTrainingDay ? TRAINING_MENUS : REST_MENUS;
    const menu = pick(menuSet, Math.floor(offset / 7));

    for (const mealType of MEAL_TYPES) {
      const tmpl = menu[mealType];
      const id = nextId('meal');
      let completion = null as MealPlan['completion'];
      if (offset < 0) {
        completion = { id: nextId('comp'), meal_plan_id: id, eaten_at: isoAt(dateStr, MEAL_HOURS[mealType], 10) };
      } else if (offset === 0 && (mealType === 'breakfast' || mealType === 'lunch')) {
        const hoursAgo = mealType === 'breakfast' ? 5 : 1.5;
        completion = {
          id: nextId('comp'),
          meal_plan_id: id,
          eaten_at: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(),
        };
      }
      meals.push({
        id,
        date: dateStr,
        meal_type: mealType,
        meal_name: tmpl.name,
        description: tmpl.description,
        kcal: tmpl.kcal,
        protein_g: tmpl.protein_g,
        carbs_g: tmpl.carbs_g,
        fat_g: tmpl.fat_g,
        prep_notes: tmpl.prep_notes ?? null,
        created_by: 'claude',
        created_at: isoAt(dateStr, 6, 0),
        completion,
      });
    }
  }
  return meals;
}

function buildHydration(now: Date, rand: () => number): HydrationLog[] {
  const logs: HydrationLog[] = [];
  const hours = [8, 11, 14, 17, 20];
  for (let offset = -45; offset < 0; offset++) {
    const dateStr = offsetDateStr(offset, now);
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const amount = 250 + Math.round(rand() * 350);
      logs.push({
        id: nextId('hyd'),
        date: dateStr,
        amount_ml: amount,
        logged_at: isoAt(dateStr, hours[i % hours.length], Math.round(rand() * 50)),
      });
    }
  }
  const todayStr = toDateStr(now);
  logs.push({
    id: nextId('hyd'),
    date: todayStr,
    amount_ml: 350,
    logged_at: new Date(now.getTime() - 3 * 3600_000).toISOString(),
  });
  logs.push({
    id: nextId('hyd'),
    date: todayStr,
    amount_ml: 400,
    logged_at: new Date(now.getTime() - 1 * 3600_000).toISOString(),
  });
  return logs;
}

function acwrBand(acwr: number): AcwrBand {
  if (acwr < 0.8) return 'undertrained';
  if (acwr < 1.3) return 'optimal';
  if (acwr < 1.5) return 'caution';
  return 'high_risk';
}

function buildTrainingLoad(now: Date, activities: Activity[], rand: () => number): TrainingLoadSummary {
  const daily_loads: DailyLoad[] = [];
  for (let offset = -34; offset <= 0; offset++) {
    const dateStr = offsetDateStr(offset, now);
    const dow = addDays(now, offset).getDay();
    const base = LOAD_BY_KIND[kindForWeekday(dow)];
    const dayLoad = base > 0 ? Math.round(clamp(base + jitter(rand, 25), 40, 420)) : 0;
    daily_loads.push({ date: dateStr, load: dayLoad, sessions: dayLoad > 0 ? 1 : 0 });
  }
  const last7 = daily_loads.slice(-7).map((d) => d.load);
  const last28 = daily_loads.slice(-28).map((d) => d.load);
  const acute_7d = Math.round(last7.reduce((s, v) => s + v, 0));
  const chronic_28d_weekly = Math.round(last28.reduce((s, v) => s + v, 0) / 4);
  const acwr = chronic_28d_weekly > 0 ? Math.round((acute_7d / chronic_28d_weekly) * 100) / 100 : null;
  const monotony = std(last7) > 0 ? Math.round((mean(last7) / std(last7)) * 100) / 100 : null;
  const strain = monotony != null ? Math.round(acute_7d * monotony) : null;

  const plannedLoad = activities
    .filter((a) => a.is_planned && a.date > toDateStr(now) && a.date <= offsetDateStr(7, now))
    .reduce((s, a) => s + LOAD_BY_KIND[kindForWeekday(new Date(`${a.date}T00:00:00`).getDay())], 0);

  return {
    date: toDateStr(now),
    acute_7d,
    chronic_28d_weekly,
    acwr,
    acwr_ewma: acwr != null ? Math.round(acwr * 0.96 * 100) / 100 : null,
    band: acwr != null ? acwrBand(acwr) : null,
    monotony,
    strain,
    daily_loads,
    chronic_days_available: 28,
    confidence: 'high',
    projected: {
      acwr_next_7d: chronic_28d_weekly > 0 ? Math.round((plannedLoad / chronic_28d_weekly) * 100) / 100 : null,
      planned_load: Math.round(plannedLoad),
    },
  };
}

function buildCorrelations(): CorrelationResult[] {
  return [
    {
      x: 'sleep_duration_mins', y: 'readiness_score', label: 'More sleep tracks with higher next-day readiness',
      lag_days: 1, n: 28, r: 0.44, p_adjusted: 0.01, significant: true, reason: null,
    },
    {
      x: 'hydration_ml', y: 'resting_hr', label: 'Better hydration tracks with a lower resting heart rate',
      lag_days: 0, n: 28, r: -0.31, p_adjusted: 0.04, significant: true, reason: null,
    },
    {
      x: 'training_load', y: 'sleep_score', label: 'Heavy training days are followed by lower sleep quality',
      lag_days: 1, n: 28, r: -0.22, p_adjusted: 0.18, significant: false, reason: 'not enough data',
    },
    {
      x: 'protein_g', y: 'muscle_mass_kg', label: 'Protein intake vs muscle mass trend',
      lag_days: 7, n: 12, r: null, p_adjusted: null, significant: false, reason: 'not enough data',
    },
  ];
}

const COACHING_LINE: Record<DayKind, string> = {
  'strength-legs': "today's a legs & core session",
  'strength-pull': "today's upper body pull work",
  'run-intervals': "today's on the calendar for intervals",
  'run-long': "there's a long steady run planned",
  football: "5-a-side is on tonight",
  mobility: 'a short mobility flow is planned',
  rest: "it's a full rest day",
};

function buildCoachingNotes(now: Date, readinessToday: ReadinessSummary, trainingLoad: TrainingLoadSummary): {
  today: CoachingNote;
  weekly: CoachingNote;
} {
  const dow = now.getDay();
  const kind = kindForWeekday(dow);
  const bandText = readinessToday.band === 'prime' || readinessToday.band === 'good' ? 'looking good' : 'a bit muted';
  const todayContent = `Readiness is ${bandText} this morning (${readinessToday.score ?? '—'}/100) — ${COACHING_LINE[kind]}. Keep protein front-loaded across the day and get ahead of hydration before the session. Nothing from recent sessions needs easing off.`;

  const bandLabel = trainingLoad.band ?? 'building';
  const weeklyContent = `Training load sits in the ${bandLabel.replace('_', ' ')} band this week (ACWR ${trainingLoad.acwr ?? '—'}). Sleep and HRV have been steady, and the Friday football sessions are adding a useful conditioning stimulus alongside the lifting. Squat and bench numbers are still trending up week over week — stay consistent with the accessory work and this keeps compounding.`;

  return {
    today: {
      id: nextId('note'),
      date: toDateStr(now),
      note_type: 'daily',
      content: todayContent,
      generated_at: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    },
    weekly: {
      id: nextId('note'),
      date: toDateStr(now),
      note_type: 'weekly',
      content: weeklyContent,
      generated_at: new Date(now.getTime() - 26 * 3600_000).toISOString(),
    },
  };
}

function buildCommonMeals(): CommonMeal[] {
  return [
    { name: 'Protein oats', description: 'Oats, whey, banana, peanut butter', kcal: 520, protein_g: 36, carbs_g: 60, fat_g: 14 },
    { name: 'Chicken & rice power bowl', description: 'Grilled chicken thigh, jasmine rice, broccoli, tahini', kcal: 700, protein_g: 50, carbs_g: 72, fat_g: 18 },
    { name: 'Protein shake & almonds', description: 'Whey shake with a handful of almonds', kcal: 320, protein_g: 26, carbs_g: 18, fat_g: 16 },
    { name: 'Cottage cheese & pineapple', description: 'Cottage cheese with fresh pineapple', kcal: 180, protein_g: 20, carbs_g: 16, fat_g: 3 },
  ];
}

export function generateDemoDataset(): DemoDataset {
  const now = new Date();
  const rand = mulberry32(Math.floor(now.getTime() / 60_000));

  const exerciseWeights = buildExerciseWeights(now);
  const exerciseHistory = buildExerciseHistory(now);
  const weeklyVolume = buildWeeklyVolume();
  const runTimes = buildRunTimes(now);
  const bodyWeight = buildBodyWeight(now, rand);
  const wellness = buildWellness(now, rand);
  const activities = buildActivities(now, rand);
  const mealPlans = buildMeals(now);
  const hydrationLogs = buildHydration(now, rand);
  const readinessSeries = buildReadinessSeries(wellness, now);
  const trainingLoad = buildTrainingLoad(now, activities, rand);
  const correlations = buildCorrelations();
  const { today: coachingNoteToday, weekly: coachingNoteWeekly } = buildCoachingNotes(
    now,
    readinessSeries[readinessSeries.length - 1],
    trainingLoad,
  );

  const planContext: Record<string, unknown> = {
    macro_targets: {
      training: { kcal: 2650, protein_g: 180, carbs_g: 290, fat_g: 80 },
      rest: { kcal: 2150, protein_g: 170, carbs_g: 180, fat_g: 70 },
    },
    hydration_target_ml: 3000,
    mobility_reminders_enabled: false,
    mobility_reminder_time: '08:00',
    reminders_enabled: false,
    reminder_interval_hours: 1,
    common_meals: buildCommonMeals(),
  };

  return {
    hydrationLogs,
    mealPlans,
    activities,
    bodyWeight,
    wellness,
    exerciseWeights,
    exerciseHistory,
    runTimes,
    weeklyVolume,
    correlations,
    readinessSeries,
    trainingLoad,
    coachingNoteToday,
    coachingNoteWeekly,
    planContext,
  };
}
