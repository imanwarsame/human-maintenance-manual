import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logActivity, getActivities } from '../../db/queries/activities.js';

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
    'get_activities',
    'Return recent activity sessions.',
    { limit: z.number().int().positive().optional().describe('Max number of sessions to return (default 20)') },
    async ({ limit }) => {
      const activities = await getActivities(limit ?? 20);
      return { content: [{ type: 'text', text: JSON.stringify(activities) }] };
    }
  );
}
