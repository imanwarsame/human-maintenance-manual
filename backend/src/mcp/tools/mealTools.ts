import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  writeMealPlan,
  updateMealPlan,
  markMealEaten,
  logMealDeviation,
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
    'Write one or more planned meals to the database for a given date or week. This is the primary tool for Claude to set up meal plans.',
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
    'log_meal_deviation',
    'Log a deviation from the meal plan (skipped, swapped, ate out, or extras).',
    {
      meal_plan_id: z.string().optional().describe('UUID of the related meal plan entry (optional)'),
      date: z.string().describe('Date of the deviation in YYYY-MM-DD format'),
      description: z.string().describe('Free-text description of the deviation'),
      kcal: z.number().int().positive().optional(),
      protein_g: z.number().positive().optional(),
      deviation_type: z.enum(['skipped', 'swapped', 'ate_out', 'extras']),
    },
    async (args) => {
      const deviation = await logMealDeviation(args);
      return { content: [{ type: 'text', text: JSON.stringify(deviation) }] };
    }
  );
}
