import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getWeeklyDigestBundle } from '../../db/queries/digest.js';

export function registerDigestTools(server: McpServer): void {
  server.tool(
    'get_weekly_digest_data',
    'Return everything needed to write a weekly "State of You" readout in one call: training load/ACWR and readiness trends vs the prior week, wellness averages, nutrition and hydration adherence, body-composition delta, incident status, and prior notes. Includes a data_quality field — respect it and do not invent detail for null or low-confidence fields.',
    {
      from: z.string().describe('Start date of the week in YYYY-MM-DD format'),
      to: z.string().describe('End date of the week in YYYY-MM-DD format'),
    },
    async ({ from, to }) => {
      const bundle = await getWeeklyDigestBundle(from, to);
      return { content: [{ type: 'text', text: JSON.stringify(bundle) }] };
    },
  );
}
