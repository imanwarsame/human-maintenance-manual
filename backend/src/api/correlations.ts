import { Router } from 'express';
import { getCorrelations } from '../db/queries/correlations.js';
import { withCache } from '../lib/cache.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const days = typeof req.query.days === 'string' ? Number(req.query.days) : undefined;
    const results = await withCache(`correlations:${days ?? 180}`, 5 * 60 * 1000, () => getCorrelations(days));
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
