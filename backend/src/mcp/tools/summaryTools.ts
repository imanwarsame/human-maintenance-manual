import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getHydrationForDate, getHydrationForDateRange } from '../../db/queries/hydration.js';
import { getMealPlansForDate, getMealPlansForDateRange } from '../../db/queries/meals.js';
import { getActivitiesForDate, getActivitiesForDateRange } from '../../db/queries/activities.js';
import { getCoachingNoteForDate, getCoachingNotesForDateRange } from '../../db/queries/coaching.js';
import { getBodyWeightLogs } from '../../db/queries/bodyWeight.js';

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
    'Return the last 7 days: hydration logs, meal plan adherence, activities, and coaching notes.',
    {},
    async () => {
      const from = nDaysAgo(6);
      const to = today();
      const [hydrationLogs, meals, activities, coachingNotes] = await Promise.all([
        getHydrationForDateRange(from, to),
        getMealPlansForDateRange(from, to),
        getActivitiesForDateRange(from, to),
        getCoachingNotesForDateRange(from, to),
      ]);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ from, to, hydrationLogs, meals, activities, coachingNotes }),
          },
        ],
      };
    }
  );

  server.tool(
    'get_month',
    'Return the last 30 days rolled up by week: hydration totals, meal adherence rate, and activity count per week.',
    {},
    async () => {
      const from = nDaysAgo(29);
      const to = today();
      const [hydrationLogs, meals, activities] = await Promise.all([
        getHydrationForDateRange(from, to),
        getMealPlansForDateRange(from, to),
        getActivitiesForDateRange(from, to),
      ]);

      const hydByWeek = groupByWeek(hydrationLogs);
      const mealsByWeek = groupByWeek(meals);
      const actByWeek = groupByWeek(activities);

      const allWeeks = Array.from(
        new Set([
          ...Object.keys(hydByWeek),
          ...Object.keys(mealsByWeek),
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
          activity_count: (actByWeek[week] ?? []).length,
        };
      });

      return { content: [{ type: 'text', text: JSON.stringify({ from, to, weeks: summary }) }] };
    }
  );

  server.tool(
    'get_period_data',
    'Get detailed meal macro data, body composition logs, and exercise/activity data across any custom date range. Returns per-day breakdowns and a period-level summary to track changes over time.',
    {
      from: z.string().describe('Start date in YYYY-MM-DD format (inclusive)'),
      to: z.string().describe('End date in YYYY-MM-DD format (inclusive)'),
    },
    async ({ from, to }) => {
      const [meals, activities, bodyComposition] = await Promise.all([
        getMealPlansForDateRange(from, to),
        getActivitiesForDateRange(from, to),
        getBodyWeightLogs(from, to),
      ]);

      // Index each dataset by date for O(1) lookup
      const bodyCompByDate = new Map(bodyComposition.map((b) => [b.date, b]));

      const activitiesByDate = new Map<string, typeof activities>();
      for (const activity of activities) {
        const bucket = activitiesByDate.get(activity.date) ?? [];
        bucket.push(activity);
        activitiesByDate.set(activity.date, bucket);
      }

      const mealsByDate = new Map<string, typeof meals>();
      for (const meal of meals) {
        const bucket = mealsByDate.get(meal.date) ?? [];
        bucket.push(meal);
        mealsByDate.set(meal.date, bucket);
      }

      const allDates = Array.from(
        new Set([
          ...mealsByDate.keys(),
          ...activitiesByDate.keys(),
          ...bodyCompByDate.keys(),
        ])
      ).sort();

      const days = allDates.map((date) => {
        const dayMeals = mealsByDate.get(date) ?? [];
        const dayActivities = activitiesByDate.get(date) ?? [];
        const dayBodyComp = bodyCompByDate.get(date) ?? null;

        const sum = (arr: typeof dayMeals, field: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g') =>
          arr.reduce((acc, m) => acc + (m[field] ?? 0), 0);

        const plannedTotals = {
          kcal: sum(dayMeals, 'kcal'),
          protein_g: sum(dayMeals, 'protein_g'),
          carbs_g: sum(dayMeals, 'carbs_g'),
          fat_g: sum(dayMeals, 'fat_g'),
        };

        const eatenMeals = dayMeals.filter((m) => m.completion !== null);
        const eatenTotals = {
          kcal: sum(eatenMeals, 'kcal'),
          protein_g: sum(eatenMeals, 'protein_g'),
          carbs_g: sum(eatenMeals, 'carbs_g'),
          fat_g: sum(eatenMeals, 'fat_g'),
        };

        // Pull exercises out of activity raw_json for strength sessions
        const exercises = dayActivities
          .filter((a) => a.raw_json?.exercises && a.raw_json.exercises.length > 0)
          .map((a) => ({
            activity_id: a.id,
            activity_type: a.type,
            is_planned: a.is_planned,
            exercises: a.raw_json!.exercises!,
          }));

        return {
          date,
          meals: {
            items: dayMeals,
            planned_totals: plannedTotals,
            eaten_totals: eatenTotals,
            adherence_pct:
              dayMeals.length > 0
                ? Math.round((eatenMeals.length / dayMeals.length) * 100)
                : null,
          },
          body_composition: dayBodyComp,
          activities: dayActivities,
          exercises,
        };
      });

      // Period-level summary
      const daysWithMeals = days.filter((d) => d.meals.items.length > 0);
      const avg = (values: number[]) =>
        values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

      const allMealCount = meals.length;
      const allEatenCount = meals.filter((m) => m.completion !== null).length;

      const firstBodyComp = bodyComposition[0] ?? null;
      const lastBodyComp = bodyComposition[bodyComposition.length - 1] ?? null;
      const bodyCompChange =
        firstBodyComp && lastBodyComp && firstBodyComp.date !== lastBodyComp.date
          ? {
              weight_kg: Math.round((lastBodyComp.weight_kg - firstBodyComp.weight_kg) * 100) / 100,
              body_fat_pct:
                firstBodyComp.body_fat_pct !== null && lastBodyComp.body_fat_pct !== null
                  ? Math.round((lastBodyComp.body_fat_pct - firstBodyComp.body_fat_pct) * 10) / 10
                  : null,
              muscle_mass_kg:
                firstBodyComp.muscle_mass_kg !== null && lastBodyComp.muscle_mass_kg !== null
                  ? Math.round((lastBodyComp.muscle_mass_kg - firstBodyComp.muscle_mass_kg) * 100) / 100
                  : null,
            }
          : null;

      const summary = {
        days_with_meal_data: daysWithMeals.length,
        avg_daily_kcal_planned: avg(daysWithMeals.map((d) => d.meals.planned_totals.kcal)),
        avg_daily_protein_g_planned: avg(daysWithMeals.map((d) => d.meals.planned_totals.protein_g)),
        avg_daily_carbs_g_planned: avg(daysWithMeals.map((d) => d.meals.planned_totals.carbs_g)),
        avg_daily_fat_g_planned: avg(daysWithMeals.map((d) => d.meals.planned_totals.fat_g)),
        avg_daily_kcal_eaten: avg(daysWithMeals.map((d) => d.meals.eaten_totals.kcal)),
        avg_daily_protein_g_eaten: avg(daysWithMeals.map((d) => d.meals.eaten_totals.protein_g)),
        avg_daily_carbs_g_eaten: avg(daysWithMeals.map((d) => d.meals.eaten_totals.carbs_g)),
        avg_daily_fat_g_eaten: avg(daysWithMeals.map((d) => d.meals.eaten_totals.fat_g)),
        overall_adherence_pct:
          allMealCount > 0 ? Math.round((allEatenCount / allMealCount) * 100) : null,
        body_composition_start: firstBodyComp,
        body_composition_end: lastBodyComp,
        body_composition_change: bodyCompChange,
        total_activities: activities.length,
        total_exercise_sets: days.reduce(
          (total, d) => total + d.exercises.reduce((s, ex) => s + ex.exercises.length, 0),
          0
        ),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify({ from, to, days, summary }) }],
      };
    }
  );
}
