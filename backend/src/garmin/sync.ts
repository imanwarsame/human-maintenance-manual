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

// Strava-compatible shape — progress.ts and ActivityCard match name /^(best )?5k$/i
interface BestEffort {
  name: string;
  elapsed_time: number;
  distance: number;
}

const FIVE_K_METRES = 5000;

function extractStream(body: unknown, type: string): number[] | null {
  // Array form: [{ type: "time", data: [...] }, ...]
  if (Array.isArray(body)) {
    const entry = body.find(
      (e) => e && typeof e === "object" && (e as { type?: string }).type === type,
    );
    const data = (entry as { data?: unknown } | undefined)?.data;
    return Array.isArray(data) ? (data as number[]) : null;
  }
  // Object form: { time: [...] } or { time: { data: [...] } }
  if (body && typeof body === "object") {
    const value = (body as Record<string, unknown>)[type];
    if (Array.isArray(value)) return value as number[];
    const data = (value as { data?: unknown } | null)?.data;
    if (Array.isArray(data)) return data as number[];
  }
  return null;
}

// Fastest contiguous window covering `target` metres, interpolating the
// window start between samples. Streams are cumulative seconds/metres.
export function bestWindowSeconds(
  time: number[],
  distance: number[],
  target: number,
): number | null {
  let best: number | null = null;
  let i = 0;
  for (let j = 0; j < distance.length; j++) {
    if (distance[j] - distance[0] < target) continue;
    while (i + 1 < j && distance[j] - distance[i + 1] >= target) i++;
    const startDist = distance[j] - target;
    const span = distance[i + 1] - distance[i];
    const frac =
      span > 0 ? Math.min(Math.max((startDist - distance[i]) / span, 0), 1) : 0;
    const startTime = time[i] + frac * (time[i + 1] - time[i]);
    const elapsed = time[j] - startTime;
    if (best === null || elapsed < best) best = elapsed;
  }
  return best !== null ? Math.round(best) : null;
}

async function computeBestEfforts(
  activityId: string,
): Promise<BestEffort[] | null> {
  try {
    const resp = await fetch(
      `${INTERVALS_BASE_URL}/activity/${activityId}/streams?types=time,distance`,
      { headers: intervalsHeaders() },
    );
    if (!resp.ok) return null;
    const body = (await resp.json()) as unknown;
    const rawTime = extractStream(body, "time");
    const rawDistance = extractStream(body, "distance");
    if (!rawTime || !rawDistance) return null;

    // Drop samples where either value is missing (GPS dropouts come through as nulls)
    const time: number[] = [];
    const distance: number[] = [];
    const len = Math.min(rawTime.length, rawDistance.length);
    for (let k = 0; k < len; k++) {
      if (Number.isFinite(rawTime[k]) && Number.isFinite(rawDistance[k])) {
        time.push(rawTime[k]);
        distance.push(rawDistance[k]);
      }
    }
    if (time.length < 2) return null;

    const elapsed = bestWindowSeconds(time, distance, FIVE_K_METRES);
    if (elapsed === null) return null;
    return [{ name: "5k", elapsed_time: elapsed, distance: FIVE_K_METRES }];
  } catch (err) {
    console.error(
      `Failed to compute 5k best effort for activity ${activityId}:`,
      err,
    );
    return null;
  }
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

  const [existing, manualActivities] = await Promise.all([
    getActivityByExternalId(String(raw.id), "garmin"),
    getManualActivitiesForDateAndType(input.date, input.type),
  ]);

  // 5K best-effort for PB tracking. Streams are only fetched once per run —
  // re-syncs reuse the previously computed value.
  if (input.type === "run" && (input.distance_km ?? 0) >= 4.9) {
    const prior = existing?.raw_json?.best_efforts as BestEffort[] | undefined;
    const best_efforts =
      Array.isArray(prior) && prior.length > 0
        ? prior
        : await computeBestEfforts(String(raw.id));
    if (best_efforts) input.raw_json = { ...input.raw_json, best_efforts };
  }

  const manualExercises = manualActivities.flatMap(
    (a) => a.raw_json?.exercises ?? [],
  );
  const fromManual = manualExercises.length > 0;
  // Re-sync: preserve exercises that were merged in a previous sync
  const exercises: Exercise[] = fromManual
    ? manualExercises
    : (existing?.raw_json?.exercises ?? []);

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
