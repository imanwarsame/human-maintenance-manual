import { Router } from 'express';
import { getCoachingNoteForDate } from '../db/queries/coaching.js';

const router = Router();

router.get('/today', async (_req, res, next) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const note = await getCoachingNoteForDate(date, 'daily');
    res.json(note ?? null);
  } catch (err) {
    next(err);
  }
});

export default router;
