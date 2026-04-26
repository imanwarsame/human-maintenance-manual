import { Router } from 'express';
import { getHydrationForDate } from '../db/queries/hydration.js';
import { getMealPlansForDate } from '../db/queries/meals.js';
import { getActivitiesForDate } from '../db/queries/activities.js';

const router = Router();

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', async (_req, res, next) => {
  try {
    const date = todayDate();
    const [hydration, meals, activities] = await Promise.all([
      getHydrationForDate(date),
      getMealPlansForDate(date),
      getActivitiesForDate(date),
    ]);
    res.json({ date, hydration, meals, activities });
  } catch (err) {
    next(err);
  }
});

export default router;
