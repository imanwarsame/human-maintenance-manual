# Human Maintenance Manual

A single-user health and performance tracking app. Claude acts as the intelligence layer — writing meal plans, planning workouts, and generating coaching notes via an MCP server. The app is a logging UI and data store.

Built for one person, but designed so anyone can fork it and adapt it to their own body, goals, and routines.

## Architecture

```
Frontend (React/Vite PWA)  ──REST──▶  Backend (Express + MCP)  ──▶  Supabase (Postgres)
                                              ▲
                                       Claude (via MCP/SSE)
```

- **Frontend**: React 19, mobile-responsive PWA, 4 screens (Home, Hydration, Activity, Nutrition)
- **Backend**: Single Node.js/Express process — REST API on `/api`, MCP server on `/mcp`
- **Database**: Supabase (Postgres). Service key lives only in the backend.
- **Auth**: Supabase magic link. Claude connects via MCP bearer token only.
- **Activity sync**: Garmin → intervals.icu (via Garmin's built-in integration) → this app via the intervals.icu API

---

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Railway](https://railway.app) account for deployment
- An [intervals.icu](https://intervals.icu) account (free — optional, for Garmin activity sync)
- Claude Desktop or Claude.ai with MCP support

---

## 1. Supabase setup

### Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL**, **anon key**, and **service role key** from Project Settings → API.

### Run the migrations

Open the SQL Editor in your Supabase dashboard and run each migration file in this exact order:

```
supabase/migrations/001_enums.sql
supabase/migrations/002_tables.sql
supabase/migrations/003_indexes.sql
supabase/migrations/004_rls.sql
supabase/migrations/005_planned_activities.sql
supabase/migrations/005_remove_deviations.sql
supabase/migrations/006_exercise_weights.sql
supabase/migrations/007_body_weight.sql
supabase/migrations/008_push_subscriptions.sql
```

Paste each file's contents into the SQL editor and click Run. Order matters — later migrations depend on earlier ones.

### Auth setup

1. In Supabase dashboard → Authentication → Providers, confirm **Email** is enabled.
2. Go to Authentication → URL Configuration. Add your frontend URL to **Redirect URLs** (e.g. `https://your-frontend.railway.app`).
3. The app uses magic link (passwordless) login — no password setup needed.

---

## 2. Environment variables

### Backend (`backend/.env`)

```env
# Server
PORT=3000
APP_URL=http://localhost:3000          # Public URL of the backend (update after deploying)
FRONTEND_URL=http://localhost:5173     # Public URL of the frontend (update after deploying)

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # Never expose this to the frontend

# MCP auth — Claude uses this bearer token to connect
MCP_SECRET=generate-a-long-random-string-here

# Garmin activity sync via intervals.icu (optional — skip if not syncing activities)
INTERVALS_ICU_API_KEY=your-intervals-icu-api-key   # intervals.icu → Settings → Developer Settings
INTERVALS_ICU_ATHLETE_ID=i123456                   # Optional — defaults to the key's owner

# Strava (legacy — Strava's API now requires a paid subscription)
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_VERIFY_TOKEN=another-random-string   # Used to verify Strava webhook calls

# Push notifications (optional — skip if not using web push)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:you@example.com
```

Generate `MCP_SECRET` and `STRAVA_VERIFY_TOKEN` with any random string generator (e.g. `openssl rand -hex 32`).

Generate VAPID keys with:
```bash
npx web-push generate-vapid-keys
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000           # Backend URL
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key        # Safe to expose — RLS enforced
```

---

## 3. Local development

```bash
npm install           # installs all workspaces

# Run in separate terminals:
npm run dev:backend   # Express on :3000
npm run dev:frontend  # Vite on :5173
```

Open `http://localhost:5173`, enter your email, and check your inbox for the magic link.

---

## 4. Deploying on Railway

Railway is the simplest option because both `railway.json` config files are already included in the repo. The frontend and backend deploy as two separate Railway services.

### Backend service

1. Push your repo to GitHub.
2. In Railway, create a **New Project** → **Deploy from GitHub repo**.
3. Select your repo. When asked for root directory, set it to **`backend/`**.
4. Railway will detect `railway.json` and use `npm run start` automatically.
5. Add all backend environment variables in the service's **Variables** tab.
6. Once deployed, copy the generated URL (e.g. `https://backend-production-xxxx.up.railway.app`).
7. Update the backend `APP_URL` variable to this URL.

### Frontend service

1. In the same Railway project, click **New Service** → **GitHub Repo** again.
2. Set root directory to **`frontend/`**.
3. Railway will detect `railway.json` and run `npm run build` then `npx serve -s dist`.
4. Add all frontend environment variables, pointing `VITE_API_URL` at your backend URL.
5. Update `FRONTEND_URL` in the backend variables to match the frontend URL.
6. Update your Supabase redirect URL in Authentication settings to include the frontend Railway URL.

### Health check

```
GET https://your-backend.railway.app/health
```

### Alternative platforms

- **Frontend**: Vercel or Netlify both work. Set `VITE_*` env vars in their dashboards.
- **Backend**: Fly.io, Render, or any platform that runs Node.js. The backend needs a persistent process (not serverless) because the MCP server is stateful SSE.

---

## 5. Garmin activity sync (via intervals.icu)

Activity sync flow: **Garmin → intervals.icu** (via Garmin's built-in integration) **→ this app**, which polls the intervals.icu API every 5 minutes.

> **Why intervals.icu?** Strava's API is now restricted to paid subscribers, Garmin's official Connect Developer Program is closed to new applicants, and Garmin blocks automated password logins to Garmin Connect. [intervals.icu](https://intervals.icu) is a free training platform that is an approved Garmin partner — Garmin Connect pushes every activity to it automatically, and it exposes a free, stable REST API.

### Setup

1. Create a free account at [intervals.icu](https://intervals.icu).
2. In intervals.icu, go to Settings → scroll to **Garmin** under Integrations and connect your Garmin Connect account. Existing history syncs across automatically.
3. Still in Settings, scroll to **Developer Settings** and generate an **API key**. Set it as `INTERVALS_ICU_API_KEY` on the backend. (Your athlete id — shown in the URL as `i123456` — can go in `INTERVALS_ICU_ATHLETE_ID`, but it defaults to the key's owner.)
4. Backfill existing activities:

```bash
curl -X POST https://your-backend.railway.app/garmin/sync-all
```

New activities appear within ~5 minutes of your watch syncing (backend polls intervals.icu). Trigger an immediate sync with `POST /garmin/sync` or by asking Claude to run the `sync_garmin` MCP tool.

Activities previously synced from Strava are kept; the Garmin sync skips any day/type that already has a Strava-sourced entry, so the backfill won't create duplicates.

For runs of 5 km or more, the sync fetches the activity's GPS streams from intervals.icu and computes the fastest contiguous 5 km — stored as a Strava-compatible `best_efforts` entry so 5K PB tracking keeps working.

Manual activity entry via the Activity screen is always available without any sync configured.

---

## 6. Connecting Claude via MCP

Claude connects to the backend MCP server over SSE. Set this up in your Claude Desktop config.

### Claude Desktop

Open `claude_desktop_config.json` (Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`) and add:

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

Restart Claude Desktop and verify the connection — you should see the MCP tools available in a new conversation.

### Claude.ai (web)

In Claude.ai → Settings → Integrations, add a new integration with the same URL and Authorization header. This enables MCP tools in the web interface.

### Other LLMs

Any LLM that supports MCP over HTTP/SSE can connect using the same URL and bearer token. The MCP spec is model-agnostic — swap Claude for any compatible client.

---

## 7. Personalising for yourself

When you first set up the system, tell Claude to populate your profile via the MCP tools. Start a conversation with Claude with your MCP server connected and run something like:

```
Use update_plan_context to set up my profile with the following information:
[paste your details]
```

### Goals and targets

The `plan_context` table is a key/value store that Claude reads before generating plans. Suggested keys to set:

| Key | Example value | Description |
|-----|--------------|-------------|
| `name` | `"Alex"` | Your name |
| `macro_targets` | `{"kcal": 2400, "protein_g": 180, "carbs_g": 250, "fat_g": 80}` | Daily nutrition targets |
| `training_structure` | `{"mon": "strength", "tue": "cardio", "wed": "rest", "thu": "strength", "fri": "cardio", "sat": "long_run", "sun": "rest"}` | Weekly training schedule |
| `dietary_preferences` | `["high protein", "no shellfish", "gluten free"]` | Food preferences and restrictions |
| `goal` | `"Build strength while maintaining 80kg body weight"` | Current primary goal |
| `notes` | `"Tends to skip breakfast when busy. Prefers batch-cooked lunches."` | Any context Claude should factor in |

Tell Claude to set these by describing yourself in plain language and asking it to populate `plan_context` accordingly.

### Injury history

Store injury context in `plan_context` so Claude can factor it into workout planning:

```
Use update_plan_context to add an entry with key "injury_history" and value:
{
  "current": ["mild left knee pain — avoid deep squats and running over 5km"],
  "past": ["right shoulder impingement (2023) — fully resolved"]
}
```

Claude reads this when using `plan_workout` and `get_plan_context`, and will automatically adjust exercise selection and loading.

### Exercise weights

The `exercise_weights` table tracks your current working weights. Claude updates these when writing workout plans and can adjust progression over time. Seed initial values by telling Claude your current lifts:

```
Record my current working weights in exercise_weights:
Squat: 100kg, Bench: 80kg, Deadlift: 140kg, OHP: 55kg
```

---

## 8. Push notifications

The app supports web push notifications for hydration and mobility reminders. Enable via Claude:

```
Use update_plan_context to set:
- reminders_enabled: true
- reminder_interval_hours: 2        (push every N hours between 8am–10pm)
- mobility_reminders_enabled: true
- mobility_reminder_time: "08:00"   (HH:MM, 24h)
```

Then open the app in your browser and accept the notification permission prompt. Notifications are delivered even when the app is closed (as long as the browser is running).

VAPID keys must be set in your backend env vars for push to work.

---

## 9. Claude routines

These prompts are designed to be run on a schedule — via a cron job, Home Assistant automation, Claude's scheduled tasks feature, or manually. Claude connects to the MCP server and calls tools to read your data and write back plans and notes.

### Sunday evening — Weekly meal plan

Claude reviews last week's data and writes the coming week's meals.

**Prompt:**
```
Call get_plan_context, then get_week.

Review last week's meal adherence. Write a full 7-day meal plan using write_meal_plan, accounting for:
- Training days vs rest days (use the training_structure from plan_context)
- Macro targets from plan_context
- Any dietary preferences or restrictions
- Variety — don't repeat the same meals from last week

Then write a weekly coaching note using write_coaching_note summarising the nutrition theme for the week ahead.
```

### Sunday evening — Weekly workout plan

Claude plans the week's training sessions.

**Prompt:**
```
Call get_plan_context and get_week.

Write a 7-day workout plan using plan_workout for each training day in the schedule. Account for:
- Current working weights from get_exercise_weights
- Any injuries or restrictions in plan_context
- Last week's training load and consistency from get_week
- Progressive overload where appropriate

Rest days should be marked as such. Include warm-up notes for any sessions involving the injury history.
```

### Daily morning — Coaching note

Claude reviews yesterday and writes today's note.

**Prompt:**
```
Call get_today and get_week.

Write a daily coaching note for today using write_coaching_note covering:
- What to train today (from plan_context training schedule)
- Any nutrition flags from yesterday (missed meals)
- Hydration reminder if yesterday's total was under 2500ml
- One practical focus for the day

Keep it under 150 words. Practical and direct.
```

### Weekly review

Claude reviews trends and adjusts targets if needed.

**Prompt:**
```
Call get_week and get_month.

Summarise:
- Hydration trend (average ml/day, improving or declining)
- Meal adherence rate
- Training frequency and consistency
- Body weight trend if data is available

If macro targets or training structure need adjusting based on the trend, use update_plan_context to update them. Then write a weekly coaching note with your findings and any changes made.
```

---

## 10. MCP tools reference

The backend exposes 23 tools to Claude across 6 modules.

### Summary
| Tool | Description |
|------|-------------|
| `get_today` | Today's hydration total, planned meals + completion status, activities, coaching note |
| `get_week` | Last 7 days: hydration, meals, activities, coaching notes |
| `get_month` | Last 30 days rolled up by week |

### Hydration
| Tool | Description |
|------|-------------|
| `log_water` | Log a hydration entry (ml) |
| `get_hydration` | Get hydration logs for a date |

### Activity
| Tool | Description |
|------|-------------|
| `log_activity` | Log a manual activity session |
| `plan_workout` | Write a planned workout for a date |
| `update_activity` | Update an existing activity record |
| `delete_activity` | Delete an activity |
| `replace_day_activities` | Replace all activities for a given day |
| `clear_activities` | Clear all activities for a date |
| `get_activities` | Return recent activity sessions |
| `get_exercise_weights` | Return current working weights |
| `sync_garmin` | Trigger a manual Garmin sync (via intervals.icu) |

### Meals
| Tool | Description |
|------|-------------|
| `write_meal_plan` | Write one or more planned meals |
| `update_meal_plan` | Update an existing planned meal |
| `mark_meal_eaten` | Mark a planned meal as eaten |
| `delete_meal` | Delete a meal plan entry |
| `replace_day_meals` | Replace all meals for a given day |

### Coaching
| Tool | Description |
|------|-------------|
| `get_coaching_note` | Return a coaching note for a date |
| `write_coaching_note` | Write a coaching note (daily or weekly) |

### Plan context
| Tool | Description |
|------|-------------|
| `get_plan_context` | Return all plan context entries (profile, targets, schedule) |
| `update_plan_context` | Upsert a plan context entry by key |

---

## 11. Data schema

Tables created by the migrations:

| Table | Description |
|-------|-------------|
| `hydration_logs` | Water intake entries |
| `activities` | Training sessions (Garmin-synced or manual). `is_planned` flag distinguishes planned vs logged. |
| `meal_plans` | Claude-written or manual meal plan entries |
| `meal_completions` | Timestamps when meals were eaten |
| `coaching_notes` | Daily and weekly notes from Claude |
| `plan_context` | Key/value store for profile, targets, training schedule, Strava tokens |
| `exercise_weights` | Current working weights per exercise |
| `body_weight_logs` | Daily body weight entries |
| `push_subscriptions` | Web push subscription endpoints for notifications |

Full column definitions are in `supabase/migrations/002_tables.sql` and subsequent migration files.

---

## 12. Adapting for yourself

The system was built for one person but the only hardcoded assumptions are in `plan_context`. Everything else (meals, workouts, targets, preferences) lives in the database and is set by Claude at your direction.

**To make it yours:**
1. Deploy the infrastructure following steps 1–6.
2. Log in with your email address.
3. Connect Claude to the MCP server.
4. Tell Claude about yourself — goals, schedule, dietary preferences, injuries, current fitness level — and ask it to populate `plan_context`.
5. Ask Claude to write your first week of meals and workouts.
6. Set up the recurring routines (step 9) on whatever scheduler you prefer.

The app has no concept of a specific user beyond the single Supabase project. If you want multi-user support, you'd need to add a `user_id` column to each table and update the RLS policies — it's architecturally straightforward but not included by default.
