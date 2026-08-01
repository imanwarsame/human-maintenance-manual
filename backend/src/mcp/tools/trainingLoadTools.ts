import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getTrainingLoad, getDailyLoadSeries } from '../../db/queries/trainingLoad.js';

export function registerTrainingLoadTools(server: McpServer): void {
  server.tool(
    'get_training_load',
    'Return training load / ACWR (acute:chronic workload ratio) for a given date, defaulting to today. Includes acute (7-day) and chronic (28-day) totals, an injury-risk band, monotony/strain, and projected load from planned sessions for the week ahead. Use this before planning a hard session to check injury risk.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    },
    async ({ date }) => {
      const summary = await getTrainingLoad(date);
      return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
    },
  );

  server.tool(
    'get_load_series',
    'Return the daily training load series (zero-filled for rest days) for a date range.',
    {
      from: z.string().describe('Start date in YYYY-MM-DD format'),
      to: z.string().describe('End date in YYYY-MM-DD format'),
    },
    async ({ from, to }) => {
      const series = await getDailyLoadSeries(from, to);
      return { content: [{ type: 'text', text: JSON.stringify(series) }] };
    },
  );
}
