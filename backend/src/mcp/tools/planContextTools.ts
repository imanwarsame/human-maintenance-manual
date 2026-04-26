import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPlanContext, getAllPlanContext, upsertPlanContext } from '../../db/queries/planContext.js';

export function registerPlanContextTools(server: McpServer): void {
  server.tool(
    'get_plan_context',
    "Return Iman's profile, macro targets, weekly training structure, and any other stored plan context. Pass a key for a specific value, or omit to get all context.",
    { key: z.string().optional().describe('Specific context key to retrieve (omit for all)') },
    async ({ key }) => {
      const value = key ? await getPlanContext(key) : await getAllPlanContext();
      return { content: [{ type: 'text', text: JSON.stringify(value) }] };
    }
  );

  server.tool(
    'update_plan_context',
    'Update a plan context value (e.g. macro targets, training structure, Strava tokens).',
    {
      key: z.string().describe('Context key (e.g. macro_targets, training_structure, strava_tokens)'),
      value: z.unknown().describe('The value to store (any JSON-serialisable value)'),
    },
    async ({ key, value }) => {
      const entry = await upsertPlanContext(key, value);
      return { content: [{ type: 'text', text: JSON.stringify(entry) }] };
    }
  );
}
