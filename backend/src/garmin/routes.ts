import { Router } from 'express';
import { syncRecentGarminActivities, syncAllGarminActivities } from './sync.js';

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

// One-time backfill (admin use)
router.post('/sync-all', async (_req, res, next) => {
  try {
    const count = await syncAllGarminActivities();
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

export default router;
