import { upsertActivity, updateActivity, getManualActivitiesForDateAndType, deleteManualActivitiesForDateAndType, type CreateActivityInput } from '../db/queries/activities.js';
import { upsertExerciseWeights } from '../db/queries/exerciseWeights.js';
import { getValidStravaToken } from './oauth.js';

interface StravaActivity {
  id: number;
  type: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  average_heartrate?: number;
  [key: string]: unknown;
}

function normaliseType(stravaType: string): string {
  const map: Record<string, string> = {
    Run: 'run',
    Ride: 'cycling',
    WeightTraining: 'strength',
    Soccer: 'football',
    Football: 'football',
    Swim: 'swim',
    Walk: 'walk',
    Hike: 'hike',
  };
  return map[stravaType] ?? stravaType.toLowerCase();
}

export async function syncStravaActivity(stravaId: number): Promise<void> {
  const token = await getValidStravaToken();
  const resp = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Strava activity fetch failed: ${resp.statusText}`);

  const raw = (await resp.json()) as StravaActivity;
  const input: CreateActivityInput = {
    date: raw.start_date.slice(0, 10),
    type: normaliseType(raw.sport_type ?? raw.type),
    source: 'strava',
    duration_mins: Math.round(raw.elapsed_time / 60),
    distance_km: raw.distance > 0 ? Math.round((raw.distance / 1000) * 100) / 100 : undefined,
    avg_hr: raw.average_heartrate ? Math.round(raw.average_heartrate) : undefined,
    raw_json: raw as Record<string, unknown>,
    external_id: String(raw.id),
  };

  const manualActivities = await getManualActivitiesForDateAndType(input.date, input.type);
  const exercises = manualActivities.flatMap((a) => a.raw_json?.exercises ?? []);

  const stravaActivity = await upsertActivity(input);

  if (exercises.length > 0) {
    await updateActivity(stravaActivity.id, {
      raw_json: { ...stravaActivity.raw_json, exercises },
    });
    const weightedExercises = exercises
      .filter((e) => e.weight_kg != null)
      .map((e) => ({ exercise_name: e.name, weight_kg: e.weight_kg! }));
    if (weightedExercises.length > 0) {
      await upsertExerciseWeights(weightedExercises);
    }
  }

  await deleteManualActivitiesForDateAndType(input.date, input.type).catch((err) =>
    console.error('Failed to delete planned activity after Strava sync:', err),
  );
}

export async function syncRecentStravaActivities(days = 2): Promise<number> {
  const token = await getValidStravaToken();
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  const resp = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${after}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`Strava activities list failed: ${resp.statusText}`);

  const activities = (await resp.json()) as StravaActivity[];
  for (const activity of activities) {
    const input: CreateActivityInput = {
      date: activity.start_date.slice(0, 10),
      type: normaliseType(activity.sport_type ?? activity.type),
      source: 'strava',
      duration_mins: Math.round(activity.elapsed_time / 60),
      distance_km: activity.distance > 0 ? Math.round((activity.distance / 1000) * 100) / 100 : undefined,
      avg_hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : undefined,
      raw_json: activity as Record<string, unknown>,
      external_id: String(activity.id),
    };

    const manualActivities = await getManualActivitiesForDateAndType(input.date, input.type);
    const exercises = manualActivities.flatMap((a) => a.raw_json?.exercises ?? []);

    const stravaActivity = await upsertActivity(input);

    if (exercises.length > 0) {
      await updateActivity(stravaActivity.id, {
        raw_json: { ...stravaActivity.raw_json, exercises },
      });
      const weightedExercises = exercises
        .filter((e) => e.weight_kg != null)
        .map((e) => ({ exercise_name: e.name, weight_kg: e.weight_kg! }));
      if (weightedExercises.length > 0) {
        await upsertExerciseWeights(weightedExercises);
      }
    }

    await deleteManualActivitiesForDateAndType(input.date, input.type).catch((err) =>
      console.error('Failed to delete planned activity after Strava sync:', err),
    );
  }
  return activities.length;
}

export async function syncAllStravaActivities(): Promise<number> {
  const token = await getValidStravaToken();
  let page = 1;
  let synced = 0;

  while (true) {
    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error(`Strava activities list failed: ${resp.statusText}`);

    const activities = (await resp.json()) as StravaActivity[];
    if (activities.length === 0) break;

    for (const activity of activities) {
      const input: CreateActivityInput = {
        date: activity.start_date.slice(0, 10),
        type: normaliseType(activity.sport_type ?? activity.type),
        source: 'strava',
        duration_mins: Math.round(activity.elapsed_time / 60),
        distance_km: activity.distance > 0 ? Math.round((activity.distance / 1000) * 100) / 100 : undefined,
        avg_hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : undefined,
        raw_json: activity as Record<string, unknown>,
        external_id: String(activity.id),
      };
      await upsertActivity(input);
      synced++;
    }
    page++;
  }

  return synced;
}
