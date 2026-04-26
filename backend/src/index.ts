import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './api/router.js';
import { mountMcp } from './mcp/server.js';
import stravaOauthRouter from './strava/oauth.js';
import stravaWebhookRouter from './strava/webhook.js';
import garminRouter from './garmin/sync.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
app.use(express.json());

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// MCP server (bearer token auth handled inside mountMcp)
mountMcp(app);

// REST API (Supabase JWT auth)
app.use('/api', apiRouter);

// Strava integration
app.use('/strava', stravaOauthRouter);
app.use('/strava/webhook', stravaWebhookRouter);

// Garmin integration
app.use('/garmin', garminRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MCP server: http://localhost:${PORT}/mcp`);
});
