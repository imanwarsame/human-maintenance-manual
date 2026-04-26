import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getHydrationForDate, getHydrationForDateRange } from '../../db/queries/hydration.js';
import { getMealPlansForDate, getMealPlansForDateRange, getDeviationsForDateRange } from '../../db/queries/meals.js';
import { getActivitiesForDate, getActivitiesForDateRange } from '../../db/queries/activities.js';
import { getCoachingNoteForDate, getCoachingNotesForDateRange } from '../../db/queries/coaching.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function groupByWeek<T extends { date: string }>(items: T[]): Record<string, T[]> {
  const weeks: Record<string, T[]> = {};
  for (const item of items) {
    const d = new Date(item.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    (weeks[key] ??= []).push(item);
  }
  return weeks;
}

export function registerSummaryTools(server: McpServer): void {
  server.tool(
    'get_today',
    "Return today's hydration total, meal plan with completion status, and activities logged today.",
    {},
    async () => {
      const date = today();
      const [hydration, meals, activities, coachingNote] = await Promise.all([
        getHydrationForDate(date),
        getMealPlansForDate(date),
        getActivitiesForDate(date),
        getCoachingNoteForDate(date, 'daily'),
      ]);
      return {
        content: [{ type: 'text', text: JSON.stringify({ date, hydration, meals, activities, coachingNote }) }],
      };
    }
  );

  server.tool(
    'get_week',
    'Return the last 7 days: hydration logs, meal plan adherence, deviations, activities, and coaching notes.',
    {},
    async () => {
      const from = nDaysAgo(6);
      const to = today();
      const [hydrationLogs, meals, deviations, activities, coachingNotes] = await Promise.all([
        getHydrationForDateRange(from, to),
        getMealPlansForDateRange(from, to),
        getDeviationsForDateRange(from, to),
        getActivitiesForDateRange(from, to),
        getCoachingNotesForDateRange(from, to),
      ]);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ from, to, hydrationLogs, meals, deviations, activities, coachingNotes }),
          },
        ],
      };
    }
  );

  server.tool(
    'get_month',
    'Return the last 30 days rolled up by week: hydration totals, meal adherence rate, deviation count, and activity count per week.',
    {},
    async () => {
      const from = nDaysAgo(29);
      const to = today();
      const [hydrationLogs, meals, deviations, activities] = await Promise.all([
        getHydrationForDateRange(from, to),
        getMealPlansForDateRange(from, to),
        getDeviationsForDateRange(from, to),
        getActivitiesForDateRange(from, to),
      ]);

      const hydByWeek = groupByWeek(hydrationLogs);
      const mealsByWeek = groupByWeek(meals);
      const devByWeek = groupByWeek(deviations);
      const actByWeek = groupByWeek(activities);

      const allWeeks = Array.from(
        new Set([
          ...Object.keys(hydByWeek),
          ...Object.keys(mealsByWeek),
          ...Object.keys(devByWeek),
          ...Object.keys(actByWeek),
        ])
      ).sort();

      const summary = allWeeks.map((week) => {
        const weekMeals = mealsByWeek[week] ?? [];
        const eaten = weekMeals.filter((m) => m.completion !== null).length;
        return {
          week_start: week,
          hydration_total_ml: (hydByWeek[week] ?? []).reduce((s, l) => s + l.amount_ml, 0),
          meals_planned: weekMeals.length,
          meals_eaten: eaten,
          adherence_pct: weekMeals.length > 0 ? Math.round((eaten / weekMeals.length) * 100) : null,
          deviation_count: (devByWeek[week] ?? []).length,
          activity_count: (actByWeek[week] ?? []).length,
        };
      });

      return { content: [{ type: 'text', text: JSON.stringify({ from, to, weeks: summary }) }] };
    }
  );
}
