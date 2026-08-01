import { Router } from 'express';
import { getCorrelations } from '../db/queries/correlations.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const days = typeof req.query.days === 'string' ? Number(req.query.days) : undefined;
    const results = await getCorrelations(days);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
