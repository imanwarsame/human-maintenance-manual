import { Router } from 'express';
import { syncStravaActivity, syncAllStravaActivities } from './sync.js';

const router = Router();

// Strava hub challenge verification
router.get('/', (req, res) => {
  const challenge = req.query['hub.challenge'];
  const verifyToken = req.query['hub.verify_token'];

  if (verifyToken !== process.env.STRAVA_VERIFY_TOKEN) {
    res.status(403).send('Invalid verify token');
    return;
  }
  res.json({ 'hub.challenge': challenge });
});

// Strava webhook event
router.post('/', async (req, res) => {
  // Respond immediately — Strava expects a fast 200
  res.status(200).send('OK');

  const { object_type, aspect_type, object_id } = req.body ?? {};
  if (object_type === 'activity' && (aspect_type === 'create' || aspect_type === 'update')) {
    syncStravaActivity(Number(object_id)).catch((err) =>
      console.error(`Strava sync failed for activity ${object_id}:`, err)
    );
  }
});

// One-time backfill (admin use)
router.post('/sync-all', async (_req, res, next) => {
  try {
    const count = await syncAllStravaActivities();
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

export default router;
