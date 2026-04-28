import { upsertActivity, type CreateActivityInput } from '../db/queries/activities.js';
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
  await upsertActivity(input);
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
    await upsertActivity(input);
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
