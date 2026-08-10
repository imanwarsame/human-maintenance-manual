import { Router } from 'express';
import { getTrainingLoad, getDailyLoadSeries } from '../db/queries/trainingLoad.js';
import { withCache } from '../lib/cache.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const summary = await withCache(`training-load:${date ?? 'today'}`, 2 * 60 * 1000, () => getTrainingLoad(date));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/series', async (req, res, next) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    if (!from || !to) {
      res.status(400).json({ error: 'from and to are required' });
      return;
    }
    const series = await getDailyLoadSeries(from, to);
    res.json(series);
  } catch (err) {
    next(err);
  }
});

export default router;
