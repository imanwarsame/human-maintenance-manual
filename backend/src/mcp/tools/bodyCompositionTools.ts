import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBodyWeightLogs, upsertBodyWeight } from '../../db/queries/bodyWeight.js';

export function registerBodyCompositionTools(server: McpServer): void {
  server.tool(
    'get_body_composition',
    'Retrieve body composition logs (weight, body fat %, muscle mass) over a date range. Omit both dates to get the last 6 months.',
    {
      from: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
    },
    async ({ from, to }) => {
      const logs = await getBodyWeightLogs(from, to);
      return { content: [{ type: 'text', text: JSON.stringify(logs) }] };
    },
  );

  server.tool(
    'log_body_composition',
    'Log or update body composition for a date. Weight is required; body fat % and muscle mass are optional.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      weight_kg: z.number().positive().describe('Body weight in kilograms'),
      body_fat_pct: z.number().positive().max(100).nullable().optional().describe('Body fat percentage (optional)'),
      muscle_mass_kg: z.number().positive().nullable().optional().describe('Muscle mass in kilograms (optional)'),
    },
    async ({ date, weight_kg, body_fat_pct, muscle_mass_kg }) => {
      const log = await upsertBodyWeight(date, weight_kg, body_fat_pct, muscle_mass_kg);
      return { content: [{ type: 'text', text: JSON.stringify(log) }] };
    },
  );
}
