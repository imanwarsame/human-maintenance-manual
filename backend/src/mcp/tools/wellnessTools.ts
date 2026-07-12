import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getWellnessLogs } from '../../db/queries/wellness.js';
import { ingestWellness } from '../../garmin/wellness.js';

export function registerWellnessTools(server: McpServer): void {
  server.tool(
    'get_wellness',
    'Retrieve daily wellness data (sleep duration, sleep score, resting heart rate, HRV, VO2 max, steps) synced from intervals.icu over a date range. Omit both dates to get the last 6 months. Fields may be null on days without data.',
    {
      from: z.string().optional().describe('Start date in YYYY-MM-DD format (inclusive)'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format (inclusive)'),
    },
    async ({ from, to }) => {
      const logs = await getWellnessLogs(from, to);
      return { content: [{ type: 'text', text: JSON.stringify(logs) }] };
    },
  );

  server.tool(
    'sync_wellness',
    'Pull recent wellness data (synced via intervals.icu) into the app immediately. Call this when the user says sleep/HRV/resting HR/steps are missing.',
    { days: z.number().int().positive().optional().describe('Days back to sync (default 2)') },
    async ({ days }) => {
      const count = await ingestWellness(days ?? 2);
      return { content: [{ type: 'text', text: JSON.stringify({ synced: count }) }] };
    },
  );
}
