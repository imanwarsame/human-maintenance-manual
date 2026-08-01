#!/usr/bin/env node
// Interactive setup wizard: collects Supabase credentials, generates secrets,
// applies all database migrations, and writes backend/.env + frontend/.env.
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";
import webpush from "web-push";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(label, { hint, defaultValue, required = false } = {}) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const hintLine = hint ? `  ${hint}\n` : "";
  for (;;) {
    const answer = (await rl.question(`${hintLine}${label}${suffix}: `)).trim();
    if (answer) return answer;
    if (defaultValue !== undefined) return defaultValue;
    if (!required) return "";
    console.log("  This value is required.");
  }
}

async function askYesNo(label, defaultYes = true) {
  const suffix = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} (${suffix}): `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

function randomHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

async function runMigrations(dbUrl) {
  const migrationsDir = path.join(rootDir, "supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(path.join(migrationsDir, file), "utf8");
      process.stdout.write(`  Applying ${file} ... `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log("ok");
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("FAILED");
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

function writeEnvFile(filePath, values) {
  const lines = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`);
  writeFileSync(filePath, lines.join("\n") + "\n");
}

async function main() {
  console.log("Human Maintenance Manual — setup wizard\n");
  console.log(
    "Before continuing, create a free project at https://supabase.com and open\n" +
      "Project Settings → API and Project Settings → Database in two tabs.\n"
  );

  const backendEnvPath = path.join(rootDir, "backend/.env");
  const frontendEnvPath = path.join(rootDir, "frontend/.env");
  if (existsSync(backendEnvPath) || existsSync(frontendEnvPath)) {
    const overwrite = await askYesNo(
      "backend/.env and/or frontend/.env already exist. Overwrite them?",
      false
    );
    if (!overwrite) {
      console.log("Aborted — no files were changed.");
      rl.close();
      return;
    }
  }

  console.log("\n--- Supabase ---");
  const supabaseUrl = await ask("Project URL", {
    hint: "Project Settings → API → Project URL",
    required: true,
  });
  const supabaseAnonKey = await ask("anon public key", {
    hint: "Project Settings → API → Project API keys → anon public",
    required: true,
  });
  const supabaseServiceKey = await ask("service_role key", {
    hint: "Project Settings → API → Project API keys → service_role (keep secret)",
    required: true,
  });
  const dbUrl = await ask("Database connection string (URI)", {
    hint:
      "Project Settings → Database → Connection string → URI. " +
      "Use the direct connection (port 5432), not the pooler.",
    required: true,
  });

  console.log("\n--- URLs (defaults are fine for local dev; update after deploying) ---");
  const appUrl = await ask("Backend public URL (APP_URL)", {
    defaultValue: "http://localhost:3000",
  });
  const frontendUrl = await ask("Frontend public URL (FRONTEND_URL)", {
    defaultValue: "http://localhost:5173",
  });

  console.log("\n--- Optional: Garmin activity/wellness sync via intervals.icu ---");
  const intervalsApiKey = await ask("intervals.icu API key (leave blank to skip)");
  const intervalsAthleteId = intervalsApiKey
    ? await ask("intervals.icu athlete id (leave blank to default to the key owner)")
    : "";

  console.log("\n--- Optional: Strava (legacy) ---");
  const stravaClientId = await ask("Strava client id (leave blank to skip)");
  const stravaClientSecret = stravaClientId ? await ask("Strava client secret", { required: true }) : "";

  console.log("\n--- Push notifications ---");
  const vapidSubject = await ask("Contact email for push notifications (VAPID_SUBJECT)", {
    defaultValue: "mailto:you@example.com",
  });

  console.log("\nGenerating secrets (MCP_SECRET, STRAVA_VERIFY_TOKEN, VAPID keypair)...");
  const mcpSecret = randomHex(32);
  const stravaVerifyToken = randomHex(32);
  const vapidKeys = webpush.generateVAPIDKeys();

  const runMigrationsNow = await askYesNo(
    "\nApply all database migrations to this project now?",
    true
  );
  if (runMigrationsNow) {
    console.log("\nRunning migrations...");
    await runMigrations(dbUrl);
    console.log("All migrations applied.");
  } else {
    console.log("Skipped — see supabase/migrations/ to apply them yourself.");
  }

  writeEnvFile(backendEnvPath, {
    PORT: 3000,
    APP_URL: appUrl,
    FRONTEND_URL: frontendUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_KEY: supabaseServiceKey,
    MCP_SECRET: mcpSecret,
    INTERVALS_ICU_API_KEY: intervalsApiKey,
    INTERVALS_ICU_ATHLETE_ID: intervalsAthleteId,
    STRAVA_CLIENT_ID: stravaClientId,
    STRAVA_CLIENT_SECRET: stravaClientSecret,
    STRAVA_VERIFY_TOKEN: stravaVerifyToken,
    VAPID_PUBLIC_KEY: vapidKeys.publicKey,
    VAPID_PRIVATE_KEY: vapidKeys.privateKey,
    VAPID_SUBJECT: vapidSubject,
  });

  writeEnvFile(frontendEnvPath, {
    VITE_API_URL: appUrl,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_VAPID_PUBLIC_KEY: vapidKeys.publicKey,
  });

  console.log("\nWrote backend/.env and frontend/.env.\n");
  console.log("What's left:");
  console.log("  1. Supabase dashboard → Authentication → Providers: confirm Email is enabled.");
  console.log(
    "  2. Supabase dashboard → Authentication → URL Configuration: add your frontend URL to Redirect URLs."
  );
  console.log("  3. npm install && npm run dev:backend / npm run dev:frontend to try it locally.");
  console.log("  4. Deploy to Railway (see README §4) when ready, then update APP_URL/FRONTEND_URL.");
  console.log("  5. Connect Claude to the MCP server using the generated MCP_SECRET (see README §6).");
}

main()
  .catch((err) => {
    console.error(`\nSetup failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
