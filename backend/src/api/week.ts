import { Router } from 'express';
import { getHydrationForDateRange } from '../db/queries/hydration.js';
import { getMealPlansForDateRange, getDeviationsForDateRange } from '../db/queries/meals.js';
import { getActivitiesForDateRange } from '../db/queries/activities.js';
import { getCoachingNotesForDateRange } from '../db/queries/coaching.js';

const router = Router();

function dateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const { from, to } = dateRange();
    const [hydrationLogs, meals, deviations, activities, coachingNotes] = await Promise.all([
      getHydrationForDateRange(from, to),
      getMealPlansForDateRange(from, to),
      getDeviationsForDateRange(from, to),
      getActivitiesForDateRange(from, to),
      getCoachingNotesForDateRange(from, to),
    ]);
    res.json({ from, to, hydrationLogs, meals, deviations, activities, coachingNotes });
  } catch (err) {
    next(err);
  }
});

export default router;
