# Human Maintenance Manual

Single-user health and performance tracking app for Iman. Claude is the intelligence layer — it writes meal plans and coaching notes via an MCP server. The app is a logging UI and data store only.

## Architecture

```
Frontend (React/Vite)  ──REST──▶  Backend (Express + MCP server)  ──▶  Supabase (Postgres)
                                         ▲
                                  Claude (via MCP/SSE)
```

- **Frontend**: React, mobile-responsive, 4 screens (Home, Hydration, Activity, Nutrition)
- **Backend**: Single Node.js/Express process — REST API on `/api`, MCP server on `/mcp`
- **Database**: Supabase (Postgres). Service key lives only in the backend.
- **Auth**: Supabase magic link. Claude connects via MCP bearer token only.
- **Activity sync**: Garmin → Strava (via Garmin's built-in Strava sync) → this app via Strava webhook. No direct Garmin integration needed.

---

## Getting started

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then run the migrations in order via the SQL editor:

```
supabase/migrations/001_enums.sql
supabase/migrations/002_tables.sql
supabase/migrations/003_indexes.sql
supabase/migrations/004_rls.sql
```

Copy your **Project URL**, **anon key**, and **service role key** from Project Settings → API.

### 2. Configure environment variables

**Backend** (`backend/.env`):
```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_VERIFY_TOKEN=random-string-for-webhook-verification
MCP_SECRET=long-random-bearer-token-for-claude
APP_URL=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and run

```bash
npm install          # installs all workspaces
npm run dev:backend  # starts Express on :3000
npm run dev:frontend # starts Vite on :5173
```

### 4. Connect Strava

Activity sync flow: **Garmin → Strava** (via Garmin's built-in Strava integration) **→ this app** via Strava webhook. You only need to connect Strava — Garmin feeds it automatically.

1. Register an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set callback domain to your host.
2. In Garmin Connect, enable the Strava integration under Settings → Connected Apps (if not already active).
3. Visit `http://localhost:3000/strava/connect` and complete OAuth to authorise the backend.
4. Register the Strava webhook once (do this after deploying, so the URL is publicly reachable):
   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -d "client_id=$STRAVA_CLIENT_ID" \
     -d "client_secret=$STRAVA_CLIENT_SECRET" \
     -d "callback_url=https://your-host/strava/webhook" \
     -d "verify_token=$STRAVA_VERIFY_TOKEN"
   ```
5. Backfill existing Strava activities: `POST https://your-host/strava/webhook/sync-all`

Manual activity entry via the Activity screen is always available as a fallback.

---

## Connecting Claude

Claude connects to the MCP server via SSE over HTTP. Add this to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "human-maintenance-manual": {
      "url": "https://your-backend.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer your-MCP_SECRET-value"
      }
    }
  }
}
```

For local development use `http://localhost:3000/mcp`.

---

## MCP tools (14 total)

| Tool | Description |
|------|-------------|
| `get_today` | Today's hydration total, meal plan + completion status, activity |
| `get_week` | Last 7 days: hydration, meals, deviations, activities, coaching notes |
| `get_month` | Last 30 days rolled up by week |
| `log_water` | Log a hydration entry |
| `get_hydration` | Get hydration logs for a date |
| `mark_meal_eaten` | Mark a planned meal as eaten |
| `log_meal_deviation` | Log a deviation (skipped/swapped/ate out/extras) |
| `write_meal_plan` | Write one or more planned meals to the DB |
| `update_meal_plan` | Update an existing planned meal |
| `log_activity` | Log a manual activity session |
| `get_activities` | Return recent activity sessions |
| `get_coaching_note` | Return today's coaching note |
| `write_coaching_note` | Write a coaching note for a given date |
| `get_plan_context` | Return Iman's profile, macro targets, training structure |
| `update_plan_context` | Update plan context (key/value store) |

---

## Claude routines

These are run externally — triggered via cron, Home Assistant, or a Claude scheduled task. Claude connects to the MCP server and calls tools directly.

### Sunday evening — Weekly meal plan

Claude calls `get_plan_context` (dietary preferences, macro targets) and `get_week` (last week's deviations and adherence), then calls `write_meal_plan` for each of the 7 coming days (typically 3–4 meals per day). Finally writes a `weekly` coaching note summarising the week ahead.

**Prompt template:**
```
Call get_plan_context, then get_week. Review last week's meal adherence and deviation patterns.
Write a full 7-day meal plan using write_meal_plan, accounting for:
- Training days vs rest days (check plan_context for the weekly schedule)
- Prior week's deviation patterns (avoid repeating meals that were frequently skipped)
- Iman's macro targets from plan_context
Then write a weekly coaching note summarising themes for the week ahead.
```

### Daily morning — Coaching note

Claude calls `get_today` (yesterday's data) and `get_week`, then writes a `daily` coaching note.

**Prompt template:**
```
Call get_today and get_week. Write a daily coaching note for today using write_coaching_note covering:
- What to train today (check plan_context for training schedule)
- Any nutrition flags from yesterday (missed meals, deviations)
- Hydration reminder if yesterday's total was under 2500 ml
Keep it under 150 words. Practical and direct.
```

### Weekly review

Claude calls `get_week` and `get_month`, reviews trends, adjusts plan context if needed, and writes a structured `weekly` review note.

**Prompt template:**
```
Call get_week and get_month. Summarise:
- Hydration trend (average ml/day, trend direction)
- Meal adherence rate and most common deviation types
- Training frequency and consistency
- Any adjustments to macro targets or training structure needed
Update plan_context if targets have changed, then write a weekly coaching note with findings.
```

---

## Deployment (Railway)

1. Push to GitHub.
2. Create a Railway project, add a service pointing to the repo root.
3. Set the root directory to `backend/`, build command `npm run build`, start command `node dist/index.js`.
4. Add all backend environment variables in Railway dashboard.
5. For the frontend: either serve via `express.static` from the backend (add a build step), or deploy separately on Vercel/Netlify pointing to `frontend/`.
6. Update `APP_URL` in backend env to the Railway service URL.
7. Update `VITE_API_URL` in frontend env to the Railway backend URL.

Health check: `GET https://your-service.railway.app/health`

---

## Data schema

See `supabase/migrations/002_tables.sql` for the full schema. Tables:

- `hydration_logs` — water intake entries
- `activities` — training sessions (Strava-synced from Garmin, or manual)
- `meal_plans` — Claude-written or manual meal plan entries
- `meal_completions` — timestamps when meals were eaten
- `meal_deviations` — deviations from the plan
- `coaching_notes` — daily and weekly notes from Claude
- `plan_context` — key/value store for profile, targets, Strava tokens, etc.
