import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Express, Request, Response } from 'express';
import { mcpAuth } from './auth.js';
import { registerSummaryTools } from './tools/summaryTools.js';
import { registerHydrationTools } from './tools/hydrationTools.js';
import { registerActivityTools } from './tools/activityTools.js';
import { registerMealTools } from './tools/mealTools.js';
import { registerCoachingTools } from './tools/coachingTools.js';
import { registerPlanContextTools } from './tools/planContextTools.js';

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'human-maintenance-manual',
    version: '1.0.0',
  });

  registerSummaryTools(server);
  registerHydrationTools(server);
  registerActivityTools(server);
  registerMealTools(server);
  registerCoachingTools(server);
  registerPlanContextTools(server);

  return server;
}

export function mountMcp(app: Express): void {
  // Track active transports for cleanup
  const transports = new Map<string, SSEServerTransport>();

  app.get('/mcp', mcpAuth, async (req: Request, res: Response) => {
    const transport = new SSEServerTransport('/mcp/message', res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    res.on('close', () => {
      transports.delete(sessionId);
    });

    const server = createMcpServer();
    await server.connect(transport);
  });

  app.post('/mcp/message', mcpAuth, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    await transport.handlePostMessage(req, res);
  });
}
