import { Router } from 'express';
import { upsertActivity, type CreateActivityInput } from '../db/queries/activities.js';

const router = Router();

interface GarminActivity {
  activityId: number;
  activityType: { typeKey: string };
  startTimeLocal: string;
  duration: number;
  distance?: number;
  averageHR?: number;
  [key: string]: unknown;
}

function normaliseGarminType(typeKey: string): string {
  const map: Record<string, string> = {
    running: 'run',
    cycling: 'cycling',
    strength_training: 'strength',
    soccer: 'football',
    swimming: 'swim',
    walking: 'walk',
    hiking: 'hike',
  };
  return map[typeKey] ?? typeKey.toLowerCase();
}

async function fetchAndUpsertGarminActivities(): Promise<number> {
  let GarminConnect: typeof import('garmin-connect').GarminConnect;
  try {
    // Dynamic import to handle optional dependency gracefully
    ({ GarminConnect } = await import('garmin-connect'));
  } catch {
    throw new Error('garmin-connect package not available');
  }

  const username = process.env.GARMIN_USERNAME;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('GARMIN_USERNAME and GARMIN_PASSWORD must be set');
  }

  const client = new GarminConnect({ username, password });
  await client.login(username, password);

  const activities = (await client.getActivities(0, 50)) as unknown as GarminActivity[];
  let synced = 0;

  for (const activity of activities) {
    try {
      const input: CreateActivityInput = {
        date: activity.startTimeLocal.slice(0, 10),
        type: normaliseGarminType(activity.activityType?.typeKey ?? 'unknown'),
        source: 'garmin',
        duration_mins: activity.duration ? Math.round(activity.duration / 60) : undefined,
        distance_km:
          activity.distance && activity.distance > 0
            ? Math.round((activity.distance / 1000) * 100) / 100
            : undefined,
        avg_hr: activity.averageHR ? Math.round(activity.averageHR) : undefined,
        raw_json: activity as Record<string, unknown>,
        external_id: String(activity.activityId),
      };
      await upsertActivity(input);
      synced++;
    } catch (err) {
      console.error(`Garmin activity ${activity.activityId} failed:`, err);
    }
  }

  return synced;
}

router.post('/sync', async (_req, res, next) => {
  try {
    const count = await fetchAndUpsertGarminActivities();
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

export { fetchAndUpsertGarminActivities };
export default router;
