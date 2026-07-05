// Garmin activity sync via intervals.icu.
//
// Garmin's official Connect Developer Program is closed to new applicants and
// their SSO blocks automated password logins, so this pulls from intervals.icu
// instead: Garmin Connect pushes every activity to intervals.icu natively
// (Settings → Integrations → Garmin), and intervals.icu exposes a free,
// stable REST API authenticated with a personal API key.
import {
  upsertActivity,
  updateActivity,
  getActivityByExternalId,
  getActivitiesForDate,
  getManualActivitiesForDateAndType,
  deleteManualActivitiesForDateAndType,
  type CreateActivityInput,
  type Exercise,
} from "../db/queries/activities.js";
import { upsertExerciseWeights } from "../db/queries/exerciseWeights.js";

const INTERVALS_BASE_URL = "https://intervals.icu/api/v1";

interface IntervalsActivity {
  id: string | number;
  type: string;
  start_date_local: string;
  moving_time?: number | null;
  elapsed_time?: number | null;
  distance?: number | null;
  average_heartrate?: number | null;
  [key: string]: unknown;
}

function intervalsHeaders(): Record<string, string> {
  const key = process.env.INTERVALS_ICU_API_KEY;
  if (!key)
    throw new Error(
      "intervals.icu not configured. Set INTERVALS_ICU_API_KEY (generate one at intervals.icu → Settings → Developer Settings).",
    );
  const basic = Buffer.from(`API_KEY:${key}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

// intervals.icu treats athlete id "0" as "the athlete who owns the API key"
function athleteId(): string {
  return process.env.INTERVALS_ICU_ATHLETE_ID ?? "0";
}

// intervals.icu uses Strava-style sport type names ("Run", "Ride", ...)
function normaliseType(intervalsType: string): string {
  const map: Record<string, string> = {
    Run: "run",
    VirtualRun: "run",
    TrailRun: "run",
    Ride: "cycling",
    VirtualRide: "cycling",
    MountainBikeRide: "cycling",
    GravelRide: "cycling",
    WeightTraining: "strength",
    Soccer: "football",
    Football: "football",
    Swim: "swim",
    OpenWaterSwim: "swim",
    Walk: "walk",
    Hike: "hike",
  };
  return map[intervalsType] ?? intervalsType.toLowerCase();
}

function toActivityInput(raw: IntervalsActivity): CreateActivityInput {
  const durationSecs = raw.moving_time ?? raw.elapsed_time ?? 0;
  const distanceMetres = raw.distance ?? 0;
  return {
    date: raw.start_date_local.slice(0, 10),
    type: normaliseType(raw.type),
    source: "garmin",
    duration_mins: Math.round(durationSecs / 60),
    distance_km:
      distanceMetres > 0
        ? Math.round((distanceMetres / 1000) * 100) / 100
        : undefined,
    avg_hr: raw.average_heartrate
      ? Math.round(raw.average_heartrate)
      : undefined,
    raw_json: raw as Record<string, unknown>,
    external_id: String(raw.id),
  };
}

async function resolveExercises(
  externalId: string,
  date: string,
  type: string,
): Promise<{ exercises: Exercise[]; fromManual: boolean }> {
  const [existing, manualActivities] = await Promise.all([
    getActivityByExternalId(externalId, "garmin"),
    getManualActivitiesForDateAndType(date, type),
  ]);
  const manualExercises = manualActivities.flatMap(
    (a) => a.raw_json?.exercises ?? [],
  );
  if (manualExercises.length > 0) {
    return { exercises: manualExercises, fromManual: true };
  }
  // Re-sync: preserve exercises that were merged in a previous sync
  const existingExercises = existing?.raw_json?.exercises ?? [];
  return { exercises: existingExercises, fromManual: false };
}

// The same physical activity may already exist as a Strava-synced row from
// before the cutover (Garmin fed Strava fed this app). Skip those so polling
// the transition window — or a full backfill — doesn't create duplicates.
async function hasStravaTwin(date: string, type: string): Promise<boolean> {
  const sameDay = await getActivitiesForDate(date);
  return sameDay.some((a) => a.source === "strava" && a.type === type);
}

async function ingestActivity(raw: IntervalsActivity): Promise<boolean> {
  const input = toActivityInput(raw);

  if (await hasStravaTwin(input.date, input.type)) return false;

  const { exercises, fromManual } = await resolveExercises(
    String(raw.id),
    input.date,
    input.type,
  );

  const activity = await upsertActivity(input);

  if (exercises.length > 0) {
    await updateActivity(activity.id, {
      raw_json: { ...activity.raw_json, exercises },
    });
    if (fromManual) {
      const weightedExercises = exercises
        .filter((e) => e.weight_kg != null)
        .map((e) => ({ exercise_name: e.name, weight_kg: e.weight_kg! }));
      if (weightedExercises.length > 0) {
        await upsertExerciseWeights(weightedExercises);
      }
    }
  }

  await deleteManualActivitiesForDateAndType(input.date, input.type).catch(
    (err) =>
      console.error(
        "Failed to delete planned activity after Garmin sync:",
        err,
      ),
  );
  return true;
}

async function fetchActivities(
  oldest: string,
  newest: string,
): Promise<IntervalsActivity[]> {
  const params = new URLSearchParams({ oldest, newest });
  const resp = await fetch(
    `${INTERVALS_BASE_URL}/athlete/${athleteId()}/activities?${params}`,
    { headers: intervalsHeaders() },
  );
  if (!resp.ok)
    throw new Error(
      `intervals.icu activities fetch failed: ${resp.status} ${resp.statusText}`,
    );
  return (await resp.json()) as IntervalsActivity[];
}

function isoDate(msOffset: number): string {
  return new Date(Date.now() + msOffset).toISOString().slice(0, 10);
}

export async function syncRecentGarminActivities(days = 2): Promise<number> {
  const oldest = isoDate(-days * 24 * 60 * 60 * 1000);
  // newest = tomorrow so local-timezone activities near midnight aren't missed
  const newest = isoDate(24 * 60 * 60 * 1000);
  const activities = await fetchActivities(oldest, newest);

  let synced = 0;
  for (const activity of activities) {
    if (await ingestActivity(activity)) synced++;
  }
  return synced;
}

export async function syncAllGarminActivities(): Promise<number> {
  const activities = await fetchActivities("2000-01-01", isoDate(24 * 60 * 60 * 1000));

  let synced = 0;
  for (const activity of activities) {
    if (await ingestActivity(activity)) synced++;
  }
  return synced;
}
