import { Router } from 'express';
import { getCoachingNoteForDate, getLatestCoachingNoteInRange } from '../db/queries/coaching.js';

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

router.get('/weekly', async (_req, res, next) => {
  try {
    // Latest weekly note from the past 7 days. The digest Routine may land on Sunday
    // or early Monday (UTC), so don't require an exact date match.
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setUTCDate(now.getUTCDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);
    const note = await getLatestCoachingNoteInRange(from, to, 'weekly');
    res.json(note ?? null);
  } catch (err) {
    next(err);
  }
});

export default router;
