import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  logActivity,
  getActivities,
  getActivitiesForDateRange,
  deleteActivity,
  deleteActivitiesForDate,
  deleteActivitiesForDateRange,
  updateActivity,
} from '../../db/queries/activities.js';
import { syncRecentGarminActivities } from '../../garmin/sync.js';
import { getExerciseWeights } from '../../db/queries/exerciseWeights.js';
import { getReadiness } from '../../db/queries/readiness.js';

const ExerciseSchema = z.object({
  name: z.string().describe('Exercise name'),
  sets: z.number().int().positive().describe('Number of sets'),
  reps: z.number().int().positive().describe('Reps per set'),
  weight_kg: z.number().positive().optional().describe('Weight in kg'),
  completed: z.boolean().optional().describe('Whether this exercise was completed'),
  skipped: z.boolean().optional().describe('Whether this exercise was skipped (equipment unavailable, etc.)'),
});

const RunIntervalSchema = z.object({
  type: z.enum(['warmup', 'interval', 'recovery', 'cooldown']).describe('Interval type'),
  distance_km: z.number().positive().describe('Distance in km'),
  pace_min_per_km: z.string().describe('Target pace (e.g. "5:30")'),
  repeats: z.number().int().positive().optional().describe('Number of repeats'),
});

const RunPlanSchema = z.object({
  total_distance_km: z.number().positive().describe('Total run distance in km'),
  target_pace_min_per_km: z.string().describe('Overall target pace (e.g. "5:30")'),
  intervals: z.array(RunIntervalSchema).optional().describe('Interval breakdown'),
});

// Standard plate increment for progressive overload suggestions
const PROGRESSION_INCREMENT_KG = 2.5;

// Round to nearest loadable increment (2.5 kg — one plate per side)
function roundToPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

interface WeightModifier {
  hold: boolean;
  deload: boolean;
}

const NO_MODIFIER: WeightModifier = { hold: false, deload: false };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Modulates progressive-overload suggestions based on the day's readiness score / ACWR.
// Only meaningful for today/tomorrow — readiness for a day planned a week out is not knowable yet.
async function computeReadinessModifier(
  date: string,
  respect: boolean,
): Promise<{ modifier: WeightModifier; readiness_adjustment?: Record<string, unknown> }> {
  if (!respect) return { modifier: NO_MODIFIER };
  const today = todayStr();
  const tomorrow = tomorrowStr();
  if (date !== today && date !== tomorrow) return { modifier: NO_MODIFIER };

  const readiness = await getReadiness(date);
  const acwrValue = readiness.components.find((c) => c.metric === 'acwr')?.value ?? null;

  const modifier: WeightModifier = { hold: false, deload: false };
  if (acwrValue != null && acwrValue > 1.5) {
    modifier.deload = true;
  } else if (readiness.score != null && readiness.score < 50) {
    modifier.deload = true;
  } else if (readiness.score != null && readiness.score < 70) {
    modifier.hold = true;
  }

  if (!modifier.hold && !modifier.deload) return { modifier };

  const rationale =
    modifier.deload && acwrValue != null && acwrValue > 1.5
      ? `ACWR ${acwrValue.toFixed(2)} exceeds 1.5 — reducing planned weight to manage injury risk.`
      : modifier.deload
      ? `Readiness ${readiness.score}/100 (${readiness.band}) — reducing planned weight rather than progressing.`
      : `Readiness ${readiness.score}/100 (${readiness.band}) — holding current weight rather than progressing.`;

  return {
    modifier,
    readiness_adjustment: {
      score: readiness.score,
      band: readiness.band,
      acwr: acwrValue,
      action: modifier.deload ? 'deload_10pct' : 'hold',
      rationale,
    },
  };
}

function applyWeightSuggestions(
  exercises: z.infer<typeof ExerciseSchema>[],
  weightMap: Map<string, { weight_kg: number; updated_at: string }>,
  modifier: WeightModifier = NO_MODIFIER,
): z.infer<typeof ExerciseSchema>[] {
  const now = Date.now();
  return exercises.map((ex) => {
    if (ex.weight_kg !== undefined) return ex;
    const record = weightMap.get(ex.name.toLowerCase());
    if (!record) return ex;

    if (modifier.deload) return { ...ex, weight_kg: roundToPlate(record.weight_kg * 0.9) };
    if (modifier.hold) return { ...ex, weight_kg: record.weight_kg };

    const daysSince = (now - new Date(record.updated_at).getTime()) / 86_400_000;

    let weight: number;
    if (daysSince < 8) {
      // ≤7 days: suggest progression — user adjusts down if they struggled
      weight = record.weight_kg + PROGRESSION_INCREMENT_KG;
    } else if (daysSince < 14) {
      // 8–13 days: same weight
      weight = record.weight_kg;
    } else if (daysSince < 21) {
      // 14–20 days: 10% deload
      weight = roundToPlate(record.weight_kg * 0.9);
    } else if (daysSince < 28) {
      // 21–27 days: 20% deload
      weight = roundToPlate(record.weight_kg * 0.8);
    } else {
      // 28+ days: 30% deload
      weight = roundToPlate(record.weight_kg * 0.7);
    }

    return { ...ex, weight_kg: weight };
  });
}

export function registerActivityTools(server: McpServer): void {
  server.tool(
    'log_activity',
    'Log a manual activity session.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      type: z.string().describe('Activity type (e.g. run, strength, football, cycling)'),
      duration_mins: z.number().int().positive().optional().describe('Duration in minutes'),
      distance_km: z.number().positive().optional().describe('Distance in kilometres'),
      avg_hr: z.number().int().positive().optional().describe('Average heart rate'),
      notes: z.string().optional().describe('Free-text notes'),
      session_rpe: z.number().int().min(1).max(10).optional().describe('Perceived effort 1-10, for training-load calculation when HR data would understate effort (e.g. football, strength)'),
    },
    async (args) => {
      const activity = await logActivity({ ...args, source: 'manual' });
      return { content: [{ type: 'text', text: JSON.stringify(activity) }] };
    }
  );

  server.tool(
    'plan_workout',
    'Create a planned future workout for a specific date. For gym sessions pass exercises; for runs pass run_plan.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      type: z.string().describe('Activity type (e.g. strength, run, football, cycling)'),
      duration_mins: z.number().int().positive().optional().describe('Expected duration in minutes'),
      distance_km: z.number().positive().optional().describe('Target distance in km (for runs)'),
      notes: z.string().optional().describe('Session notes or focus'),
      exercises: z.array(ExerciseSchema).optional().describe('Exercise list for gym sessions'),
      run_plan: RunPlanSchema.optional().describe('Structured run plan with intervals'),
      respect_readiness: z.boolean().optional().describe('Modulate suggested weights based on the day\'s readiness score and ACWR (default true). Only has an effect when date is today or tomorrow.'),
    },
    async ({ date, type, duration_mins, distance_km, notes, exercises, run_plan, respect_readiness }) => {
      let resolvedExercises = exercises;
      let readinessAdjustment: Record<string, unknown> | undefined;
      if (exercises && exercises.length > 0) {
        const weights = await getExerciseWeights();
        const weightMap = new Map(weights.map((w) => [w.exercise_name.toLowerCase(), w]));
        const { modifier, readiness_adjustment } = await computeReadinessModifier(date, respect_readiness ?? true);
        readinessAdjustment = readiness_adjustment;
        resolvedExercises = applyWeightSuggestions(exercises, weightMap, modifier);
      }
      const raw_json = (resolvedExercises || run_plan) ? { exercises: resolvedExercises, run_plan } : undefined;
      const activity = await logActivity({
        date,
        type,
        source: 'manual',
        duration_mins,
        distance_km,
        notes,
        raw_json,
        is_planned: true,
      });
      const payload = readinessAdjustment ? { ...activity, readiness_adjustment: readinessAdjustment } : activity;
      return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
    }
  );

  server.tool(
    'delete_activity',
    'Delete a single activity by its ID.',
    {
      id: z.string().uuid().describe('Activity UUID to delete'),
    },
    async ({ id }) => {
      await deleteActivity(id);
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: id }) }] };
    }
  );

  server.tool(
    'clear_activities',
    'Delete all activities for a specific date or date range. Use date to clear one day, or from+to to clear a range (e.g. a full week). Affects both logged and planned activities.',
    {
      date: z.string().optional().describe('Single date to clear (YYYY-MM-DD). Mutually exclusive with from/to.'),
      from: z.string().optional().describe('Start of date range to clear (YYYY-MM-DD).'),
      to: z.string().optional().describe('End of date range to clear (YYYY-MM-DD).'),
    },
    async ({ date, from, to }) => {
      if (date) {
        const count = await deleteActivitiesForDate(date);
        return { content: [{ type: 'text', text: JSON.stringify({ cleared_date: date, deleted_count: count }) }] };
      }
      if (from && to) {
        const count = await deleteActivitiesForDateRange(from, to);
        return { content: [{ type: 'text', text: JSON.stringify({ cleared_from: from, cleared_to: to, deleted_count: count }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Provide either date or both from and to.' }) }] };
    }
  );

  server.tool(
    'update_activity',
    'Update fields on an existing activity session — e.g. correct notes, duration, or exercise weights. Pass only the fields you want to change.',
    {
      id: z.string().uuid().describe('Activity UUID to update'),
      type: z.string().optional().describe('Activity type'),
      duration_mins: z.number().int().positive().optional(),
      distance_km: z.number().positive().optional(),
      avg_hr: z.number().int().positive().optional(),
      notes: z.string().optional(),
      session_rpe: z.number().int().min(1).max(10).optional().describe('Perceived effort 1-10, for training-load calculation'),
      exercises: z.array(ExerciseSchema).optional().describe('Full updated exercise list (replaces existing)'),
      run_plan: RunPlanSchema.optional().describe('Full updated run plan (replaces existing)'),
    },
    async ({ id, exercises, run_plan, ...rest }) => {
      const raw_json = (exercises !== undefined || run_plan !== undefined)
        ? { exercises, run_plan }
        : undefined;
      const activity = await updateActivity(id, {
        ...rest,
        ...(raw_json !== undefined ? { raw_json } : {}),
      });
      return { content: [{ type: 'text', text: JSON.stringify(activity) }] };
    }
  );

  server.tool(
    'replace_day_activities',
    'Replace all activities for a given date. Clears existing activities then logs new ones — use this when correcting or rewriting a full day\'s plan.',
    {
      date: z.string().describe('Date to replace activities for (YYYY-MM-DD)'),
      activities: z.array(z.object({
        type: z.string().describe('Activity type (e.g. strength, run, football, cycling)'),
        duration_mins: z.number().int().positive().optional(),
        distance_km: z.number().positive().optional(),
        notes: z.string().optional(),
        exercises: z.array(ExerciseSchema).optional(),
        run_plan: RunPlanSchema.optional(),
        is_planned: z.boolean().optional().describe('True for future planned sessions'),
      })).min(1),
      respect_readiness: z.boolean().optional().describe('Modulate suggested weights based on the day\'s readiness score and ACWR (default true). Only has an effect when date is today or tomorrow.'),
    },
    async ({ date, activities, respect_readiness }) => {
      await deleteActivitiesForDate(date);
      const weights = await getExerciseWeights();
      const weightMap = new Map(weights.map((w) => [w.exercise_name.toLowerCase(), w]));
      const { modifier, readiness_adjustment } = await computeReadinessModifier(date, respect_readiness ?? true);
      const created = await Promise.all(
        activities.map(({ type, duration_mins, distance_km, notes, exercises, run_plan, is_planned }) => {
          const resolvedExercises = exercises ? applyWeightSuggestions(exercises, weightMap, modifier) : undefined;
          const raw_json = (resolvedExercises || run_plan) ? { exercises: resolvedExercises, run_plan } : undefined;
          return logActivity({ date, type, source: 'manual', duration_mins, distance_km, notes, raw_json, is_planned: is_planned ?? false });
        })
      );
      const payload = readiness_adjustment ? { activities: created, readiness_adjustment } : { activities: created };
      return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
    }
  );

  server.tool(
    'get_exercise_weights',
    'Return the current working weight for each tracked exercise. Use this when planning a gym session to apply progressive overload.',
    {},
    async () => {
      const weights = await getExerciseWeights();
      return { content: [{ type: 'text', text: JSON.stringify(weights) }] };
    }
  );

  server.tool(
    'sync_garmin',
    'Pull recent Garmin activities (synced via intervals.icu) into the app immediately. Call this when the user says activities are missing.',
    { days: z.number().int().positive().optional().describe('Days back to sync (default 2)') },
    async ({ days }) => {
      const count = await syncRecentGarminActivities(days ?? 2);
      return { content: [{ type: 'text', text: JSON.stringify({ synced: count }) }] };
    }
  );

  server.tool(
    'get_activities',
    'Return recent activity sessions. Pass from/to for a date range, or limit for recent sessions.',
    {
      limit: z.number().int().positive().optional().describe('Max sessions to return (default 20, used when no date range given)'),
      from: z.string().optional().describe('Start date YYYY-MM-DD for range query'),
      to: z.string().optional().describe('End date YYYY-MM-DD for range query'),
    },
    async ({ limit, from, to }) => {
      const activities = (from && to)
        ? await getActivitiesForDateRange(from, to)
        : await getActivities(limit ?? 20);
      return { content: [{ type: 'text', text: JSON.stringify(activities) }] };
    }
  );
}
