import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logWater, getHydrationForDate } from '../../db/queries/hydration.js';

export function registerHydrationTools(server: McpServer): void {
  server.tool(
    'log_water',
    'Log a water intake entry for a given date.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      amount_ml: z.number().int().positive().describe('Amount of water in millilitres'),
    },
    async ({ date, amount_ml }) => {
      const log = await logWater(date, amount_ml);
      return { content: [{ type: 'text', text: JSON.stringify(log) }] };
    }
  );

  server.tool(
    'get_hydration',
    'Get hydration logs for a specific date.',
    { date: z.string().describe('Date in YYYY-MM-DD format') },
    async ({ date }) => {
      const result = await getHydrationForDate(date);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}
