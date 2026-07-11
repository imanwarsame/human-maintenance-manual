import { Router } from 'express';
import { getWellnessLogs } from '../db/queries/wellness.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const logs = await getWellnessLogs(from, to);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
