// Wellness data (sleep, HRV, resting HR, VO2 max, steps, weight, body fat)
// sync via intervals.icu — same account/API key as activity sync in sync.ts.
import { INTERVALS_BASE_URL, intervalsHeaders, athleteId, isoDate } from "./sync.js";
import { upsertWellness } from "../db/queries/wellness.js";
import { getBodyWeightLogForDate, upsertBodyWeight } from "../db/queries/bodyWeight.js";

interface IntervalsWellness {
  id: string; // date, YYYY-MM-DD
  sleepSecs?: number | null;
  sleepScore?: number | null;
  restingHR?: number | null;
  hrv?: number | null;
  vo2max?: number | null;
  steps?: number | null;
  weight?: number | null;
  bodyFat?: number | null;
  [key: string]: unknown;
}

async function fetchWellness(oldest: string, newest: string): Promise<IntervalsWellness[]> {
  const params = new URLSearchParams({ oldest, newest });
  const resp = await fetch(
    `${INTERVALS_BASE_URL}/athlete/${athleteId()}/wellness?${params}`,
    { headers: intervalsHeaders() },
  );
  if (!resp.ok)
    throw new Error(
      `intervals.icu wellness fetch failed: ${resp.status} ${resp.statusText}`,
    );
  return (await resp.json()) as IntervalsWellness[];
}

async function ingestWellnessRecord(raw: IntervalsWellness): Promise<void> {
  const date = raw.id;

  await upsertWellness({
    date,
    sleep_duration_mins: raw.sleepSecs != null ? Math.round(raw.sleepSecs / 60) : undefined,
    sleep_score: raw.sleepScore ?? undefined,
    resting_hr: raw.restingHR ?? undefined,
    hrv: raw.hrv ?? undefined,
    vo2_max: raw.vo2max ?? undefined,
    steps: raw.steps ?? undefined,
    raw_json: raw as Record<string, unknown>,
  });

  // Weight/body fat feed the existing body_weight_logs table, but never
  // clobber a day the user has manually logged/corrected.
  if (raw.weight != null || raw.bodyFat != null) {
    const existing = await getBodyWeightLogForDate(date);
    if (!existing || existing.source === "garmin") {
      const weight_kg = raw.weight ?? existing?.weight_kg;
      if (weight_kg != null) {
        await upsertBodyWeight(date, weight_kg, raw.bodyFat ?? existing?.body_fat_pct, undefined, "garmin");
      }
    }
  }
}

export async function ingestWellness(days = 5): Promise<number> {
  const oldest = isoDate(-days * 24 * 60 * 60 * 1000);
  const newest = isoDate(24 * 60 * 60 * 1000);
  const records = await fetchWellness(oldest, newest);

  let synced = 0;
  for (const record of records) {
    await ingestWellnessRecord(record);
    synced++;
  }
  return synced;
}

export async function syncAllWellness(): Promise<number> {
  const records = await fetchWellness("2000-01-01", isoDate(24 * 60 * 60 * 1000));

  let synced = 0;
  for (const record of records) {
    await ingestWellnessRecord(record);
    synced++;
  }
  return synced;
}
