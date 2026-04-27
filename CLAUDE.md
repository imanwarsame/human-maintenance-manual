# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Run both frontend and backend
npm run dev:frontend   # Vite dev server on :5173
npm run dev:backend    # Express + MCP server on :3000 (tsx watch)
```

### Build
```bash
npm run build          # Build both frontend and backend
npm run build:frontend # TypeScript check + Vite bundle
npm run build:backend  # tsc → dist/
```

No lint or test scripts are configured.

## Architecture

This is a **monorepo health-tracking app** for a single user (Iman). Claude acts as the intelligence layer — writing meal plans and coaching notes — while the app is the logging UI and data store.

```
frontend/ (React/Vite)  ──JWT──▶  backend/ (Express + MCP)  ──▶  Supabase (Postgres)
                                        ▲
                                 Claude via MCP/SSE
```

### Frontend (`frontend/src/`)

- **Router**: React Router v7 in `App.tsx`. Auth gate → magic link login, then 4 protected routes: `/` (Home), `/hydration`, `/activity`, `/nutrition`.
- **State**: TanStack Query v5 — no Redux/Zustand. Custom hooks in `hooks/` wrap all queries and mutations. Query keys: `['today']`, `['hydration']`, `['meals']`, etc.
- **API client**: `api/client.ts` — thin fetch wrapper that auto-injects the Supabase JWT bearer token.
- **Styling**: Tailwind CSS v3.

### Backend (`backend/src/`)

Single Node.js process running Express + MCP server together.

- `index.ts` — app entry point, mounts routes at `/api/*`, `/mcp`, `/strava/*`
- `api/` — REST handlers: `activities`, `coaching`, `hydration`, `meals`, `planContext`, `today`, `week`
- `db/queries/` — all Supabase query functions (never query from route handlers directly)
- `mcp/server.ts` — MCP server with 14 tools across 6 modules (summary, hydration, activity, meals, coaching, planContext)
- `mcp/auth.ts` — bearer token middleware for MCP endpoints
- `middleware/` — `errorHandler`, `auth` (JWT verification for REST routes)
- `strava/` — OAuth flow, webhook receiver, Garmin → Strava → app sync

### Database (Supabase)

Migrations in `supabase/migrations/`:
1. `001_enums.sql` — custom enum types
2. `002_tables.sql` — core tables: `hydration_logs`, `activities`, `meal_plans`, `meal_deviations`, `coaching_notes`, `plan_context`
3. `003_indexes.sql` — performance indexes
4. `004_rls.sql` — row-level security policies

Frontend uses the **anon key** (auth-gated). Backend uses the **service role key** (never exposed to frontend).

## Key Patterns

**Adding a new data operation:**
1. Add a query function in `backend/src/db/queries/`
2. Add a REST route handler in `backend/src/api/`
3. Add an MCP tool in `backend/src/mcp/tools/` and register it in `mcp/server.ts`
4. Add a React Query hook in `frontend/src/hooks/`
5. Consume in the relevant screen component

**React Query mutations** always invalidate the affected query keys on success to keep the UI in sync.

**TypeScript** is strict on both sides. Frontend `tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` set to error.
