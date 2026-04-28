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
import { syncRecentStravaActivities } from '../../strava/sync.js';
import { getExerciseWeights } from '../../db/queries/exerciseWeights.js';

const ExerciseSchema = z.object({
  name: z.string().describe('Exercise name'),
  sets: z.number().int().positive().describe('Number of sets'),
  reps: z.number().int().positive().describe('Reps per set'),
  weight_kg: z.number().positive().optional().describe('Weight in kg'),
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
    },
    async ({ date, type, duration_mins, distance_km, notes, exercises, run_plan }) => {
      const raw_json = (exercises || run_plan) ? { exercises, run_plan } : undefined;
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
      return { content: [{ type: 'text', text: JSON.stringify(activity) }] };
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
    },
    async ({ date, activities }) => {
      await deleteActivitiesForDate(date);
      const created = await Promise.all(
        activities.map(({ type, duration_mins, distance_km, notes, exercises, run_plan, is_planned }) => {
          const raw_json = (exercises || run_plan) ? { exercises, run_plan } : undefined;
          return logActivity({ date, type, source: 'manual', duration_mins, distance_km, notes, raw_json, is_planned: is_planned ?? false });
        })
      );
      return { content: [{ type: 'text', text: JSON.stringify(created) }] };
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
    'sync_strava',
    'Pull recent Strava activities into the app immediately. Call this when the user says activities are missing.',
    { days: z.number().int().positive().optional().describe('Days back to sync (default 2)') },
    async ({ days }) => {
      const count = await syncRecentStravaActivities(days ?? 2);
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
