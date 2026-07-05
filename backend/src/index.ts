import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRouter from "./api/router.js";
import { mountMcp } from "./mcp/server.js";
import stravaOauthRouter from "./strava/oauth.js";
import stravaWebhookRouter from "./strava/webhook.js";
import garminRouter from "./garmin/routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { syncRecentGarminActivities } from "./garmin/sync.js";
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

// Strava integration (legacy — Strava's API now requires a subscription)
app.use("/strava", stravaOauthRouter);
app.use("/strava/webhook", stravaWebhookRouter);

// Garmin activity sync (via intervals.icu)
app.use("/garmin", garminRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MCP server: http://localhost:${PORT}/mcp`);

  startReminderScheduler();
  startMobilityReminderScheduler();

  // Poll intervals.icu every 5 minutes — Garmin pushes activities there
  // automatically, and there is no webhook on the free API
  const GARMIN_POLL_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      await syncRecentGarminActivities(5);
    } catch {
      // Silently ignore — API key may not be configured yet
    }
  }, GARMIN_POLL_MS);
});
