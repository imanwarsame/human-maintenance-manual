import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Express, Request, Response } from 'express';
import { mcpAuth } from './auth.js';
import { registerSummaryTools } from './tools/summaryTools.js';
import { registerHydrationTools } from './tools/hydrationTools.js';
import { registerActivityTools } from './tools/activityTools.js';
import { registerMealTools } from './tools/mealTools.js';
import { registerCoachingTools } from './tools/coachingTools.js';
import { registerPlanContextTools } from './tools/planContextTools.js';
import { registerBodyCompositionTools } from './tools/bodyCompositionTools.js';
import { registerHealthIncidentTools } from './tools/healthIncidentTools.js';
import { registerWellnessTools } from './tools/wellnessTools.js';
import { registerTrainingLoadTools } from './tools/trainingLoadTools.js';
import { registerReadinessTools } from './tools/readinessTools.js';
import { registerDigestTools } from './tools/digestTools.js';
import { registerCorrelationTools } from './tools/correlationTools.js';

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
  registerBodyCompositionTools(server);
  registerHealthIncidentTools(server);
  registerWellnessTools(server);
  registerTrainingLoadTools(server);
  registerReadinessTools(server);
  registerDigestTools(server);
  registerCorrelationTools(server);

  return server;
}

export function mountMcp(app: Express): void {
  // Stateless streamable HTTP transport — single endpoint, no session tracking needed
  app.all('/mcp', mcpAuth, async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: no session persistence
    });

    res.on('close', () => {
      transport.close();
    });

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
}
