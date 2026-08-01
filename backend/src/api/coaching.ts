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

router.get('/weekly', async (_req, res, next) => {
  try {
    // Most recent Sunday on/before today — the digest Routine always writes with today's date, on a Sunday.
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const mostRecentSunday = new Date(now);
    mostRecentSunday.setDate(now.getDate() - dayOfWeek);
    const date = mostRecentSunday.toISOString().slice(0, 10);
    const note = await getCoachingNoteForDate(date, 'weekly');
    res.json(note ?? null);
  } catch (err) {
    next(err);
  }
});

export default router;
