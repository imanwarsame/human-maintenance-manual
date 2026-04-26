import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logActivity, getActivities, getActivitiesForDateRange } from '../../db/queries/activities.js';

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
