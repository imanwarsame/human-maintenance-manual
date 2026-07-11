import { Router } from 'express';
import { syncRecentGarminActivities, syncAllGarminActivities } from './sync.js';
import { ingestWellness, syncAllWellness } from './wellness.js';

const router = Router();

// On-demand sync of recent activities (admin use)
router.post('/sync', async (req, res, next) => {
  try {
    const days = Number(req.body?.days ?? 2);
    const count = await syncRecentGarminActivities(days);
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

// On-demand sync of recent wellness data (admin use)
router.post('/sync-wellness', async (req, res, next) => {
  try {
    const days = Number(req.body?.days ?? 2);
    const count = await ingestWellness(days);
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

// One-time backfill (admin use)
router.post('/sync-all', async (_req, res, next) => {
  try {
    const [activities, wellness] = await Promise.all([
      syncAllGarminActivities(),
      syncAllWellness(),
    ]);
    res.json({ synced: activities, synced_wellness: wellness });
  } catch (err) {
    next(err);
  }
});

export default router;
