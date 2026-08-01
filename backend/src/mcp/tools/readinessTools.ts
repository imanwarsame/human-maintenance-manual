import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getReadiness } from '../../db/queries/readiness.js';

export function registerReadinessTools(server: McpServer): void {
  server.tool(
    'get_readiness',
    'Return a composite daily readiness score (0-100) for a given date, defaulting to today, built from HRV, resting HR, sleep, and training load (ACWR) compared against the user\'s own rolling baseline, with an incident-severity modifier applied if there is an active or recovering injury/illness. Use this before planning a hard session.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    },
    async ({ date }) => {
      const summary = await getReadiness(date);
      return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
    },
  );
}
