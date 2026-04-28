import { Router } from 'express';
import { markMealEaten, getMealPlansForDate, getMealPlansForDateRange } from '../db/queries/meals.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { date, from, to } = req.query as Record<string, string | undefined>;
    if (from && to) {
      const meals = await getMealPlansForDateRange(from, to);
      res.json(meals);
      return;
    }
    const d = date ?? new Date().toISOString().slice(0, 10);
    const meals = await getMealPlansForDate(d);
    res.json(meals);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const eaten_at = (req.body?.eaten_at as string | undefined) ?? new Date().toISOString();
    const completion = await markMealEaten(id, eaten_at);
    res.status(201).json(completion);
  } catch (err) {
    next(err);
  }
});

export default router;
