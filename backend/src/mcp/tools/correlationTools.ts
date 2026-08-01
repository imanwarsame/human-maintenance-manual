import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCorrelations } from '../../db/queries/correlations.js';

export function registerCorrelationTools(server: McpServer): void {
  server.tool(
    'get_correlations',
    'Return statistically-guarded correlations between wellness, training, nutrition, and readiness metrics over a lookback window (default 180 days). Pairs are directionally lagged and filtered by minimum sample size (n>=14), correlation strength (|r|>=0.4), and Holm-Bonferroni-corrected significance. Treat results as associations, not causal claims, and never use them to drive automated planning decisions.',
    {
      days: z.number().int().positive().optional().describe('Lookback window in days (default 180)'),
    },
    async ({ days }) => {
      const results = await getCorrelations(days);
      return { content: [{ type: 'text', text: JSON.stringify(results) }] };
    },
  );
}
