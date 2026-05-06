import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./api/router.js";
import { mountMcp } from "./mcp/server.js";
import stravaOauthRouter from "./strava/oauth.js";
import stravaWebhookRouter from "./strava/webhook.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { syncRecentStravaActivities } from "./strava/sync.js";
import {
  startReminderScheduler,
  startMobilityReminderScheduler,
} from "./scheduler/reminders.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json());

// Health check (no auth)
app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// MCP server (bearer token auth handled inside mountMcp)
mountMcp(app);

// REST API (Supabase JWT auth)
app.use("/api", apiRouter);

// Strava integration
app.use("/strava", stravaOauthRouter);
app.use("/strava/webhook", stravaWebhookRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MCP server: http://localhost:${PORT}/mcp`);

  startReminderScheduler();
  startMobilityReminderScheduler();

  // Poll Strava every 10 minutes to catch activities the webhook might miss
  const STRAVA_POLL_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      await syncRecentStravaActivities(5);
    } catch {
      // Silently ignore — token may not be connected yet
    }
  }, STRAVA_POLL_MS);
});
