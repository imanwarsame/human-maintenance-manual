import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  writeMealPlan,
  updateMealPlan,
  markMealEaten,
  deleteMealPlan,
  deleteMealsForDate,
} from '../../db/queries/meals.js';

const MealInputSchema = z.object({
  date: z.string(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  meal_name: z.string(),
  description: z.string().optional(),
  kcal: z.number().int().positive().optional(),
  protein_g: z.number().positive().optional(),
  carbs_g: z.number().positive().optional(),
  fat_g: z.number().positive().optional(),
  prep_notes: z.string().optional(),
  created_by: z.enum(['claude', 'manual']).optional(),
});

export function registerMealTools(server: McpServer): void {
  server.tool(
    'write_meal_plan',
    'Write one or more planned meals to the database for a given date or week. NOTE: this tool is ADDITIVE — it appends to any existing meals for that date. Use replace_day_meals instead when you want to rewrite a full day\'s plan.',
    { meals: z.array(MealInputSchema).min(1).describe('Array of meal plan entries to create') },
    async ({ meals }) => {
      const created = await writeMealPlan(meals.map((m) => ({ ...m, created_by: m.created_by ?? 'claude' })));
      return { content: [{ type: 'text', text: JSON.stringify(created) }] };
    }
  );

  server.tool(
    'update_meal_plan',
    'Update an existing planned meal, e.g. to swap a meal based on what is available.',
    {
      meal_plan_id: z.string().describe('UUID of the meal plan entry to update'),
      updates: MealInputSchema.partial().describe('Fields to update'),
    },
    async ({ meal_plan_id, updates }) => {
      const updated = await updateMealPlan(meal_plan_id, updates);
      return { content: [{ type: 'text', text: JSON.stringify(updated) }] };
    }
  );

  server.tool(
    'mark_meal_eaten',
    'Mark a planned meal as eaten.',
    {
      meal_plan_id: z.string().describe('UUID of the meal plan entry'),
      eaten_at: z.string().optional().describe('ISO timestamp when the meal was eaten (defaults to now)'),
    },
    async ({ meal_plan_id, eaten_at }) => {
      const completion = await markMealEaten(meal_plan_id, eaten_at ?? new Date().toISOString());
      return { content: [{ type: 'text', text: JSON.stringify(completion) }] };
    }
  );

  server.tool(
    'delete_meal',
    'Delete a single meal from the plan by its UUID.',
    { id: z.string().uuid().describe('Meal plan UUID to delete') },
    async ({ id }) => {
      await deleteMealPlan(id);
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: id }) }] };
    }
  );

  server.tool(
    'replace_day_meals',
    'Replace all meals for a given date with a new set. Deletes existing meals for that date then writes the new ones — use this instead of write_meal_plan when correcting or rewriting a full day\'s plan.',
    {
      date: z.string().describe('Date to replace meals for (YYYY-MM-DD)'),
      meals: z.array(MealInputSchema.omit({ date: true })).min(1).describe('New meals for the day'),
    },
    async ({ date, meals }) => {
      await deleteMealsForDate(date);
      const created = await writeMealPlan(
        meals.map((m) => ({ ...m, date, created_by: m.created_by ?? 'claude' }))
      );
      return { content: [{ type: 'text', text: JSON.stringify(created) }] };
    }
  );

}
